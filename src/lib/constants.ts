export const LUGGAGE_SIZE_MAP = {
  none: '无',
  small: '小件（背包/手提包）',
  medium: '中件（20寸行李箱）',
  large: '大件（24寸行李箱）',
  xlarge: '超大（28寸+）',
} as const;

export const LUGGAGE_OPTIONS = Object.entries(LUGGAGE_SIZE_MAP).map(([value, label]) => ({
  value,
  label,
}));

export const GENDER_MAP = {
  male: '男',
  female: '女',
} as const;

export const GENDER_OPTIONS = Object.entries(GENDER_MAP).map(([value, label]) => ({
  value,
  label,
}));

export const TRIP_STATUS_MAP = {
  open: '拼车中',
  full: '已满员',
  cancelled: '已取消',
} as const;

export const MAX_PASSENGERS_OPTIONS = [1, 2, 3, 4, 5, 6];

export interface LocationOption {
  name: string;
  children?: string[];
  customChild?: boolean;
}

export const LOCATION_OPTIONS: LocationOption[] = [
  { name: '武汉天河机场', children: ['T2航站楼', 'T3航站楼'] },
  { name: '武汉站', children: ['东进站口', '西进站口'] },
  { name: '武昌站' },
  { name: '汉口站' },
  { name: '武汉东站' },
  { name: '中南财首义校区', children: ['南门', '北门'] },
  { name: '中南财南湖校区', customChild: true },
];
