exports.getTodayEtWindowUtc = () => {
  const nowUtc = new Date();

  const etOffsetMinutes = -240; // UTC-5 for Eastern Time
  const nowEt = new Date(nowUtc.getTime() + etOffsetMinutes * 60000);

  const startEt = new Date(nowEt);
  startEt.setHours(0, 0, 0, 0);

  const endEt = new Date(startEt);
  endEt.setDate(endEt.getDate() + 1);

  const startUtc = new Date(startEt.getTime() - etOffsetMinutes * 60000);
  const endUtc = new Date(endEt.getTime() - etOffsetMinutes * 60000);

  return { startUtc, endUtc };
};
