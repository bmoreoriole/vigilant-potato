const { nanoid } = require('nanoid');

const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const gaussian = (mean = 0, sd = 1) => {
  const u = 1 - Math.random(), v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sd + mean;
};
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const generateId = () => nanoid(12);
const formatMoney = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};
const parseMoney = (s) => {
  s = String(s).replace(/[$,\s]/g, '').toUpperCase();
  if (s.endsWith('M')) return Math.round(parseFloat(s) * 1_000_000);
  if (s.endsWith('K')) return Math.round(parseFloat(s) * 1_000);
  return Math.round(parseFloat(s));
};

module.exports = { random, randomChoice, gaussian, clamp, generateId, formatMoney, parseMoney };