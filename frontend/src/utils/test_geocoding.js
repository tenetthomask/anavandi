import { resolveFullRouteGeometry, cleanStopName } from './geocoding.js';

const stops = ["WONDERL", "GURUVAYC", "GURUVAYC", "MUKAMBIK", "NELLIYAMI", "GURUVAYC", "GURUVAYC", "MUNNAR", "WAYANAD", "ILLIKKAI K"];
console.log("Stops:", stops);

resolveFullRouteGeometry(stops).then(coords => {
  console.log("Resolved coords:", coords);
  console.log("Length:", coords.length);
}).catch(err => {
  console.error("Error:", err);
});
