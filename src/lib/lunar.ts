/**
 * Thuật toán Âm Lịch - Dương Lịch Việt Nam (Múi giờ GMT+7)
 * Dựa trên thuật toán thiên văn Hồ Ngọc Đức để quy đổi chính xác:
 * 1. Ngày Dương lịch -> Ngày Âm lịch Việt Nam (Can Chi, Tháng Nhuận)
 * 2. Ngày Âm lịch (Lịch giỗ / Sự kiện hàng năm) -> Ngày Dương lịch tương ứng trong năm hiện tại/tiếp theo
 */

const PI = Math.PI;

function INT(d: number): number {
  return Math.floor(d);
}

export function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd =
    dd +
    INT((153 * m + 2) / 5) +
    365 * y +
    INT(y / 4) -
    INT(y / 100) +
    INT(y / 400) -
    32045;
  if (jd < 2299161) {
    jd =
      dd +
      INT((153 * m + 2) / 5) +
      365 * y +
      INT(y / 4) -
      32083;
  }
  return jd;
}

export function jdToDate(jd: number): [number, number, number] {
  let a: number, b: number, c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  const day = e - INT((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * INT(m / 10);
  const year = b * 100 + d - 4800 + INT(m / 10);
  return [day, month, year];
}

function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3;
  Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 =
    C1 -
    0.0074 * Math.sin(dr * (M - Mpr)) +
    0.0004 * Math.sin(dr * (2 * F + M));
  C1 =
    C1 -
    0.0004 * Math.sin(dr * (2 * F - M)) -
    0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 =
    C1 +
    0.001 * Math.sin(dr * (2 * F - Mpr)) +
    0.0005 * Math.sin(dr * (2 * Mpr + M));
  let deltat: number;
  if (T < -11) {
    deltat =
      0.001 +
      0.000839 * T +
      0.0002261 * T2 -
      0.00000845 * T3 -
      0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  const JdNew = Jd1 + C1 - deltat;
  return INT(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(jdn: number, timeZone = 7): number {
  const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL =
    DL +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return INT((L / PI) * 6);
}

function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

function getLeapMonthOffset(a11: number, timeZone = 7): number {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  leap: boolean;
  canChiYear: string;
}

const CAN = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
const CHI = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];

export function getCanChiYear(lunarYear: number): string {
  return `${CAN[lunarYear % 10]} ${CHI[lunarYear % 12]}`;
}

export function solarToLunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone = 7
): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
    canChiYear: getCanChiYear(lunarYear),
  };
}

export function lunarToSolar(
  lunarDay: number,
  lunarMonth: number,
  lunarYear: number,
  lunarLeap = false,
  timeZone = 7
): [number, number, number] {
  let a11: number, b11: number;
  if (lunarMonth < 11) {
    a11 = getLunarMonth11(lunarYear - 1, timeZone);
    b11 = getLunarMonth11(lunarYear, timeZone);
  } else {
    a11 = getLunarMonth11(lunarYear, timeZone);
    b11 = getLunarMonth11(lunarYear + 1, timeZone);
  }
  const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunarMonth - 11;
  if (off < 0) {
    off += 12;
  }
  if (b11 - a11 > 365) {
    const leapOff = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }
    if (lunarLeap && lunarMonth !== leapMonth) {
      return [0, 0, 0];
    } else if (lunarLeap || off >= leapOff) {
      off += 1;
    }
  }
  const monthStart = getNewMoonDay(k + off, timeZone);
  return jdToDate(monthStart + lunarDay - 1);
}

/**
 * Tính ngày Dương lịch sắp tới gần nhất cho một sự kiện Âm lịch hoặc Dương lịch
 * và trả về số ngày còn lại (daysUntil)
 */
export function getNextEventOccurrence(
  day: number,
  month: number,
  calendarType: "lunar" | "solar",
  now: Date = new Date()
): {
  solarDateStr: string;
  solarDay: number;
  solarMonth: number;
  solarYear: number;
  daysUntil: number;
  lunarDisplay: string;
} {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentSolarYear = today.getFullYear();

  if (calendarType === "solar") {
    let target = new Date(currentSolarYear, month - 1, day);
    if (target.getTime() < today.getTime()) {
      target = new Date(currentSolarYear + 1, month - 1, day);
    }
    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    const l = solarToLunar(
      target.getDate(),
      target.getMonth() + 1,
      target.getFullYear()
    );
    return {
      solarDateStr: `${String(target.getDate()).padStart(2, "0")}/${String(
        target.getMonth() + 1
      ).padStart(2, "0")}/${target.getFullYear()}`,
      solarDay: target.getDate(),
      solarMonth: target.getMonth() + 1,
      solarYear: target.getFullYear(),
      daysUntil: diffDays,
      lunarDisplay: `${String(l.day).padStart(2, "0")}/${String(
        l.month
      ).padStart(2, "0")} Âm lịch (${l.canChiYear})`,
    };
  } else {
    // Sự kiện Âm lịch: kiểm tra năm âm hiện tại và năm âm kế tiếp
    const todayLunar = solarToLunar(
      today.getDate(),
      today.getMonth() + 1,
      today.getFullYear()
    );
    let [sDay, sMonth, sYear] = lunarToSolar(day, month, todayLunar.year, false);
    let target = new Date(sYear, sMonth - 1, sDay);
    let targetLunarYear = todayLunar.year;

    if (target.getTime() < today.getTime()) {
      targetLunarYear = todayLunar.year + 1;
      [sDay, sMonth, sYear] = lunarToSolar(day, month, targetLunarYear, false);
      target = new Date(sYear, sMonth - 1, sDay);
    }
    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      solarDateStr: `${String(sDay).padStart(2, "0")}/${String(sMonth).padStart(
        2,
        "0"
      )}/${sYear}`,
      solarDay: sDay,
      solarMonth: sMonth,
      solarYear: sYear,
      daysUntil: diffDays,
      lunarDisplay: `Mùng/Ngày ${String(day).padStart(2, "0")}/${String(
        month
      ).padStart(2, "0")} Âm lịch (${getCanChiYear(targetLunarYear)})`,
    };
  }
}

/**
 * Helper lấy mã kỳ hiện tại cho Tuần / Tháng / Năm
 */
export function getCurrentPeriodKeys(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const quarter = Math.ceil((date.getMonth() + 1) / 3);

  // Tính ISO Week
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return {
    weekly: `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`,
    monthly: `${year}-${month}`,
    quarterly: `${year}-Q${quarter}`,
    yearly: `${year}`,
  };
}
