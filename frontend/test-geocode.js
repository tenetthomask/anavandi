async function fetchOSMCoordinates(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "myapp@example.com" }
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data && data.length > 0) {
        console.log(query, "=>", data[0].lat, data[0].lon, data[0].display_name);
        return data[0];
      } else {
        console.log(query, "=> Not found");
      }
    } catch(e) {
      console.log(query, "=> FAILED PARSING:", text.substring(0, 100));
    }
  } catch (err) {
    console.warn(`Geocoding fetch error for '${query}':`, err);
  }
}

async function test() {
  await fetchOSMCoordinates("GURUVAYOOR");
  await fetchOSMCoordinates("MUNNAR");
  await fetchOSMCoordinates("WAYANAD");
  await fetchOSMCoordinates("B.B.D BAG");
  await fetchOSMCoordinates("NAIHATI");
  await fetchOSMCoordinates("BIMANBANDAR");
}

test();
