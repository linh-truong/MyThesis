﻿using System.Linq;
using System.Web.Http;
using ApiServer.Models.User;
using ServerApi.DAL;
using System.Data.Entity; 

namespace ApiServer.Controllers
{
    [RoutePrefix("api/users/{userId}/ships")]
    public class ShipApisController : ApiController
    {
        private readonly ThesisContext _context = new ThesisContext();

        [Route("")]
        [HttpGet]
        public IHttpActionResult GetAllShips(int userId)
        {
            var user = _context.Users.FirstOrDefault(u => u.Id == userId);
            if (user == null) return NotFound();

            if (user.UserRole == UserRole.User)
            {
                return Ok(_context.Ships.Include(s=>s.ShipLocations).Where(s => s.UserId == user.Id));
            }

            return Ok(_context.Ships.Include(s => s.ShipLocations).ToList());
        }

    }
}