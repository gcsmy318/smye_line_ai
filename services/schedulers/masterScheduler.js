
const cron = require("node-cron");

function startSchedulers() {
  cron.schedule("0 8 * * 0,1,2,5", ()=>{}, {timezone:"Asia/Bangkok"});
  cron.schedule("0 13 * * 0", ()=>{}, {timezone:"Asia/Bangkok"});
  cron.schedule("0 12 * * 5", ()=>{}, {timezone:"Asia/Bangkok"});
  cron.schedule("0 9 * * 0", ()=>{}, {timezone:"Asia/Bangkok"});
  cron.schedule("30 11 * * 0", ()=>{}, {timezone:"Asia/Bangkok"});
  cron.schedule("0 12 * * 1", ()=>{}, {timezone:"Asia/Bangkok"});
  cron.schedule("0 8 * * 5,6", ()=>{}, {timezone:"Asia/Bangkok"});
  cron.schedule("0 15 * * 6", ()=>{}, {timezone:"Asia/Bangkok"});
}

module.exports = { startSchedulers };
