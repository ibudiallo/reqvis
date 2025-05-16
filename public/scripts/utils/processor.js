const Processor = {
  processLine: function (line) {
    const [ip,,, date, tz, method, uri, scheme, statusCode, size, referrer, ...ua] = line.split(" ");
    const [dateStr, ...timeParts] = date.substr(1).split(":");
    const dateParts = dateStr.split("/");
   let dateTimeStr = "";
    try {
        dateTimeStr = `${dateParts[1]} ${dateParts[0]}, ${
        dateParts[2]
      } ${timeParts.join(":") + "." + tz.trim().substr(1).replace("]", "") }Z`;
    } catch(e) {
        console.log("Error parsing date:", e, line);
        throw "an error occurred while parsing the date";
    }
    return {
        ip,
        dateTime: new Date(dateTimeStr),
        method: method.replace(/"/g, ""),
        uri,
        statusCode: parseInt(statusCode),
        size,
        referrer,
        userAgent: ua.join(" "),
    };
  },
  validate: function (data) {
    // Validate the data here
    console.log("Validating data:", data);
    // Return true if valid, false otherwise
    return true;
  },
  format: function (data) {
    // Format the data here
    console.log("Formatting data:", data);
    // Return the formatted data
    return JSON.stringify(data, null, 2);
  },
};

export default Processor;
