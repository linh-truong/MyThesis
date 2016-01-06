﻿(function () {
    'use strict';

    angular
        .module('app')
        .controller('simulateCtrl', simulateCtrl);

    simulateCtrl.$inject = ['userSvc', '$location', 'spinnerUtilSvc', 'commonDataSvc', 'commonSvc', '$timeout', '$interval'];

    function simulateCtrl(userSvc, $location, spinnerUtilSvc, commonDataSvc, commonSvc, $timeout, $interval) {
        var vm = this;

        vm.overlay = angular.element(document.querySelector('#overlay'));
        vm.leafletMap = {};
        vm.simulateSettings = {};
        vm.progressBarSettings = {
            totalTimes: 1,
            isRunning: false,
            isDisplay: false
        };

        vm.hasMapControl = false;

        var mainToggleButton = angular.element('#mainToggleButton');
        var mainTimer = {};

        vm.logout = logout;
        vm.applySettings = applySettings;

        init();

        function init() {
            userSvc.validateCurrentUser();
            vm.currentUser = userSvc.getCurrentUser();

            setupLeafletMap();
            setupLeafletMapData();
        }

        function logout() {
            userSvc.setCurrentUser({});
            $location.path('/dang-nhap');
            sessionStorage.removeItem('user');
        }

        function setupLeafletMap() {
            L.mapbox.accessToken = 'pk.eyJ1IjoidHZsaW5oIiwiYSI6ImNpZzJlMXRubDFiYmp0emt2OTJidmpsdHkifQ.es8RI1Tt5uJAEmE33tWkrw#6/13.699/110.369';
            vm.leafletMap = L.mapbox.map('leaflet-map').setView([13.699, 110.369], 6);
            vm.leafletMap.legendControl.addLegend(document.getElementById('legend').innerHTML);
            vm.leafletMap.doubleClickZoom.disable();

            L.control.coordinates({
                position: "bottomleft",
                decimals: 6,
                decimalSeperator: ".",
                labelTemplateLat: "Vĩ độ: {y} - ",
                labelTemplateLng: "Kinh độ: {x}",
                enableUserInput: true,
                useDMS: false,
                useLatLngOrder: true,
                markerType: L.marker,
                markerProps: {}
            }).addTo(vm.leafletMap);
        }

        function setupLeafletMapData() {
            spinnerUtilSvc.showSpinner('spinnerSearch', vm.overlay);
            commonDataSvc.getSummaryData(vm.currentUser).then(function (response) {
                vm.summaryData = response.data;
                vm.baseMaps = [
                    {
                        groupName: "Bản đồ",
                        expanded: true,
                        layers: commonSvc.getBaseMaps(vm.leafletMap)
                    }
                ];

                //vm.internationalShipLocationLayers = commonSvc.getOverlayInternationalShipLocationLayers(vm.leafletMap, vm.summaryData.LastInternationShipData.Data);
                //vm.shipLocationLayersForSimulate = commonSvc.getOverlayShipLocationLayersForSimulate(vm.leafletMap, vm.summaryData.Ships, vm.selectedSpeedValue);
                vm.overlayStormLayers = commonSvc.getOverlayStormLayers(vm.leafletMap, vm.summaryData.Storms);
                vm.overlayWarningLocationLayers = commonSvc.getOverlayWarningLocationLayers(vm.summaryData.WarningLocations);
                vm.overlayWeatherLayers = commonSvc.getOverlayWeatherLayers();

                //vm.overlayLayers = [
                //     {
                //         groupName: "Thời tiết",
                //         layers: vm.overlayWeatherLayers
                //     },
                //     {
                //         groupName: "Tàu quốc tế",
                //         layers: vm.internationalShipLocationLayers
                //     },
                //     {
                //         groupName: "Tàu",
                //         layers: null
                //     },
                //    {
                //        groupName: "Bão",
                //        layers: vm.overlayStormLayers
                //    },
                //    {
                //        groupName: "Cảnh báo",
                //        layers: vm.overlayWarningLocationLayers
                //    }
                //];
                vm.overlayLayers = [
                     {
                         groupName: "Tàu",
                         layers: null
                     }
                ];

                vm.options = {
                    container_width: "250px"
                };

                spinnerUtilSvc.hideSpinner('spinnerSearch', vm.overlay);
            }, function () {
                spinnerUtilSvc.hideSpinner('spinnerSearch', vm.overlay);
            });
        }

        function applySettings() {
            $timeout.cancel(mainTimer.Ship);
            $timeout.cancel(mainTimer.progressBar);
            $timeout.cancel(mainTimer.internationalShip2);
            $interval.cancel(mainTimer.internationalShip);

            if (!validateSimluateSettings()) return;
            if (!vm.simulateSettings.displayShip && !vm.simulateSettings.displayInternationalShip) {
                mainToggleButton.click();
                return;
            }

            if (vm.overlayLayers[0].layers) {
                for (var key in vm.overlayLayers[0].layers) {
                    if (vm.leafletMap.hasLayer(vm.overlayLayers[0].layers[key])) vm.leafletMap.removeLayer(vm.overlayLayers[0].layers[key]);
                }
                if (vm.hasMapControl) {
                    vm.leafletMap.removeControl(vm.styledLayerControl);
                    vm.hasMapControl = false;
                }
            }

            var filterInternationalShips = commonSvc.getInternationalShipAfterFilterOut(vm.summaryData.InternationShipData, vm.simulateSettings);
            var minTimeOfInternationalShip = filterInternationalShips.length !== 0 ? vm.simulateSettings.totalTime / filterInternationalShips.length : 1;

            var filterdShips = commonSvc.getShipAfterFilterOut(vm.summaryData.Ships, vm.simulateSettings);
            var minTimeOfShip = getMinTimeOfShip(filterdShips, vm.simulateSettings.totalTime);

            var finalMinTime = minTimeOfInternationalShip > minTimeOfShip ? minTimeOfInternationalShip : minTimeOfShip;

            simulateShip(finalMinTime);
            simulateInternationalShip(finalMinTime);

            vm.progressBarSettings.totalTimes = vm.simulateSettings.totalTime;
            vm.progressBarSettings.isDisplay = false;

            mainTimer.progressBar = $timeout(function () {
                vm.progressBarSettings.isDisplay = true;
                vm.progressBarSettings.isRunning = true;
            }, 1000);


            mainToggleButton.click();

            function simulateShip(timeOfShip) {
                if (!vm.simulateSettings.displayShip) return;

                vm.overlayLayers[0].layers = commonSvc.getOverlayShipLocationLayersForSimulate(vm.leafletMap, filterdShips, timeOfShip);

                vm.styledLayerControl = L.Control.styledLayerControl(vm.baseMaps, vm.overlayLayers, vm.options);
                vm.leafletMap.addControl(vm.styledLayerControl);
                vm.hasMapControl = true;

                mainTimer.Ship = $timeout(function () {
                    vm.leafletMap.addLayer(vm.overlayLayers[0].layers['Tất cả']);
                }, 1000);
            }

            function simulateInternationalShip(timeOfInternationalShip) {
                if (vm.internationalShipLocationLayers && vm.leafletMap.hasLayer(vm.internationalShipLocationLayers['Tàu quốc tế']))
                    vm.leafletMap.removeLayer(vm.internationalShipLocationLayers['Tàu quốc tế']);
                if (!vm.simulateSettings.displayInternationalShip || filterInternationalShips.length <= 0) return;

                var count = 0;
                mainTimer.internationalShip2 = $timeout(function() {
                    mainTimer.internationalShip = $interval(function () {
                        if (count === filterInternationalShips.length) {
                            $interval.cancel(mainTimer.internationalShip);
                            return;
                        }
                        if (vm.internationalShipLocationLayers && vm.leafletMap.hasLayer(vm.internationalShipLocationLayers['Tàu quốc tế']))
                            vm.leafletMap.removeLayer(vm.internationalShipLocationLayers['Tàu quốc tế']);
                        vm.internationalShipLocationLayers = commonSvc.getOverlayInternationalShipLocationLayers(vm.leafletMap, filterInternationalShips[count].Data);
                        vm.internationalShipLocationLayers['Tàu quốc tế'].addTo(vm.leafletMap);
                        count++;
                    }, timeOfInternationalShip * 1000);
                }, 500);
               

            }

            function getMinTimeOfShip(currentShips, totalTime) {
                var maxNumOfLocations = 1;
                currentShips.forEach(function (item) {
                    var numOfShipLocations = item.ShipLocations.length;
                    if (maxNumOfLocations <= numOfShipLocations) maxNumOfLocations = numOfShipLocations;
                });
                return totalTime / maxNumOfLocations;
            }
        }

        function validateSimluateSettings() {
            if (!vm.simulateSettings.totalTime || vm.simulateSettings.totalTime <= 0) {
                toastr.error('Chưa nhập tổng thời gian mô phỏng');
                return false;
            }
            if (!vm.simulateSettings.startAt) {
                toastr.error('Chưa chọn ngày bắt đầu');
                return false;
            }
            if (!vm.simulateSettings.endAt) {
                toastr.error('Chưa chọn ngày kết thúc');
                return false;
            }
            if (vm.simulateSettings.startAt > vm.simulateSettings.endAt) {
                toastr.error('Ngày bắt đầu không được lớn hơn ngày kết thúc');
                return false;
            }

            return true;
        }

    }
})();