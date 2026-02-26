// constants/filters.ts

export interface PriceRange {
  label: string
  min: number
  max: number
}

export interface StarOption {
  value: number
  label: string
}

// 价格区间
export const PRICE_RANGES: PriceRange[] = [
  { label:'¥200以下',  min:0,    max:200   },
  { label:'¥200–350',  min:200,  max:350   },
  { label:'¥350–500',  min:350,  max:500   },
  { label:'¥500–700',  min:500,  max:700   },
  { label:'¥700–1000', min:700,  max:1000  },
  { label:'¥1000–1500',min:1000, max:1500  },
  { label:'¥1500–2500',min:1500, max:2500  },
  { label:'¥2500以上', min:2500, max:99999 },
]

// 星级选项
export const STAR_OPTIONS: StarOption[] = [
  { value:1, label:'一星级' },
  { value:2, label:'二星级' },
  { value:3, label:'三星级' },
  { value:4, label:'四星级' },
  { value:5, label:'五星级' },
]