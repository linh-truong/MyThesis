﻿(function () {
    angular
        .module('app')
        .directive('addShip', addShip);

    function addShip() {
        var directive = {
            restrict: 'E',
            scope: {
                overlay: '=',
                users: '='
            },
            templateUrl: 'src/addShip/add-ship.html',
            controller: 'addShipCtrl',
            controllerAs: 'vm'
        };

        return directive;
    }
})();