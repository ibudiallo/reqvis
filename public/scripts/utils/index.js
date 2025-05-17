export const byteFormat = (bytes) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index++;
  }
  return `${bytes.toFixed(2)} ${units[index]}`;
};

export const createArray = (size, defaultValue = 0) => {
  return new Array(size).fill(defaultValue);
};

export const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


export const valueBetweenInt = (val, min, max) => {
    return val >= min && val <= max;
}