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
};

export const timer = (fn, delay) => {
  const id = setTimeout(fn, delay * 1000);
  return () => clearTimeout(id);
};
export const wait = (delay) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(wait);
    }, delay * 1000);
  });
};

export const clamp = (num, min, max) => Math.max(min, Math.min(num, max));