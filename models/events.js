'use strict';
var pg = require("pg");

/**
 * An Array of all the events
 */
var allEvents = [];

var connString = process.env.DB_DIALECT + "://" + process.env.DB_USR + ":" + process.env.DB_PWD + 
                "@" + process.env.DB_HOST + ":" + process.env.DB_PORT + "/" + process.env.DB_TBL + "?ssl=true"; 

//Connect to database and retrieve a list of events and store in allEvents local variable
pg.connect(connString, function(err, client, done){
  if (err){console.log(err);return;}
  client.query('SELECT id, title, date, image_url, location, attending FROM events_table', function(err, result) {
    if (!err) {
      for (var e in result.rows) {
        var newEvent = {
          id: result.rows[e].id,
          title: result.rows[e].title,
          location: result.rows[e].location,
          image: result.rows[e].image_url,
          date: result.rows[e].date,
          attending: result.rows[e].attending
        };
        allEvents.push(newEvent);
      }
      done();  // client idles for 30 seconds before closing
    } else {
      console.log(err);
    }
  });
});

/* 
 * This function is called each time a database error needs to be handled
 */
 function handleError(err, client, done) {
  // no error occurred, continue with the request
  if(!err) return false;

  // An error occurred, remove the client from the connection pool.
  // A truthy value passed to done will remove the connection from the pool
  // instead of simply returning it to be reused.
  // In this case, if we have successfully received a client (truthy)
  // then it will be removed from the pool.
  if(client){
    done(client);
  }
  return true;
}

/* 
 * Add a new event, save to database, retrieve all events from database and store in allEvents local variable
 * Takes an event object ev as parameter and a callback function cb as second parameter
 * If unsuccessful, call callback with error message; if successful, callback with allEvents
 */
function addEvent(ev, cb) {
    pg.connect(connString, function(err, client, done) {
      // handle an error from the connection
      if(handleError(err, client, done)) cb (err, null);
      else
        client.query('INSERT INTO events_table (id, title, date, image_url, location, attending) VALUES ($1, $2, $3, $4, $5, $6)', [ev.id, ev.title, ev.date, ev.image, ev.location, ev.attending], function(err, result) {
          // handle an error from the query
          if(handleError(err, client, done)) cb (err, null);
          else {
            //client.query('SELECT * FROM public.listEvents()', function(err, result) {
            client.query('SELECT id, title, date, image_url, location, attending FROM events_table', function(err, result) {
              if (handleError(err, client, done)) cb (err, null); 
              else {
                //console.log(result.fields);
                allEvents = [];
                for (var e in result.rows) {
                  var newEvent = {
                    id: result.rows[e].id,
                    title: result.rows[e].title,
                    location: result.rows[e].location,
                    image: result.rows[e].image_url,
                    date: result.rows[e].date,
                    attending: result.rows[e].attending
                  };
                  //console.log(newEvent);
                  allEvents.push(newEvent);
                }
                cb (null, allEvents);
                done();  // client idles for 30 seconds before closing
              } 
            });
          }
        });
    });
}

/* 
 * Add a new email to attending list of event with eventId, save to database, retrieve all events from database and store in allEvents local variable
 * Takes an event object ev as parameter and a callback function cb as second parameter
 * If unsuccessful, call callback with error message; if successful, callback with modified event
 */
function addAttending (eventId, email, cb) {
  var ev = getById(eventId);
  if (!ev) {cb (new Error('Event does not exist.'), null); return;}
  
  ev.attending.push(email);
  pg.connect(connString, function(err, client, done) {
    // handle an error from the connection
    if(handleError(err, client, done)) cb (err, null);
    else
      client.query(
          'UPDATE events_table SET (attending) = ($1) WHERE id = $2', 
          [ev.attending, eventId], 
          function(err, result) {
        // handle an error from the query
        if(handleError(err, client, done)) cb (err, null);
        else {
          client.query('SELECT id, title, date, image_url, location, attending FROM events_table', function(err, result) {
            if (handleError(err, client, done)) cb (err, null); 
            else {
              //rebuild local variable allEvents
              allEvents = [];
              for (var e in result.rows) {
                var newEvent = {
                  id: result.rows[e].id,
                  title: result.rows[e].title,
                  location: result.rows[e].location,
                  image: result.rows[e].image_url,
                  date: result.rows[e].date,
                  attending: result.rows[e].attending
                };
                allEvents.push(newEvent);
              }
              cb (null, getById(eventId));
              done();  // client idles for 30 seconds before closing
            } 
          });
        }
      });
  });
}

/**
 * Returns the first event that has a particular id.
 */
function getById (id) {
  for (var i = allEvents.length - 1; i >= 0; i--) {
    if (id === allEvents[i].id){
      return allEvents[i];
    }
  }
  return null;
}

/**
 * Returns array of all events with titles that contain the string str.
 */
function getByTitle (str) {
  var res = [];
  for (var i = allEvents.length - 1; i >= 0; i--) {
    if (allEvents[i].title.indexOf(str) >=0){
      res.push(allEvents[i]);
    }
  }
  return res;
}

/**
 * Returns the highest existing id + 1.
 */
function nextId () {
  var j=0;
  for (var i = allEvents.length - 1; i >= 0; i--) {
    if (j < allEvents[i].id){
      j=allEvents[i].id
    }
  }
  return j+1;
}

/**
 * Returns array of all events with date later than today's date.
 */
function futureEvents() {
  var res = [];
  var today_date = new Date();
  for (var i = allEvents.length - 1; i >= 0; i--) {
    if (allEvents[i].date > today_date){
      res.push(allEvents[i]);
    }
  }
  return res;
}

module.exports = exports = {
  all: allEvents,
  addEvent      : addEvent,
  addAttending  : addAttending,
  getById: getById,
  getByTitle: getByTitle,
  nextId: nextId,
  futures: futureEvents
};