// ─── 基础实体 ──────────────────────────────────────────────────────────────────

export interface Tag {
  id:     number
  name:       string
  tag_type:   'facility' | 'special'
  sort_order: number
}

export interface HotelMedia {
  media_id:   number
  media_url:  string
  media_type: 'image' | 'video'
  is_cover:   boolean
  sort_order: number
}

export interface RoomType {
  room_type_id: number
  name:         string
  bed_info:     string
  max_guests:   number
  base_price:   number
}

export interface Hotel {
  hotel_id:     number
  name_zh:      string
  name_en?:     string
  phone:        string
  star_rating:  number
  city?:        string
  address:      string
  longitude:    number
  latitude:     number
  cover_url:    string
  opening_date: string
  description?: string
  distance?:    string
  images:       HotelMedia[]
  tags:         Tag[]
  room_types?:  RoomType[]
  // 由 Service 层计算后附加
  estimatedPrice?: number
  totalPrice?:     number
}

// ─── 搜索 & 筛选 ──────────────────────────────────────────────────────────────

export interface SearchParams {
  city?:        string
  keyword?:     string
  checkIn?:     string
  checkOut?:    string
  nights?:      number
  rooms:        number
  adults:       number
  children:     number
  minPrice?:    number
  maxPrice?:    number
  starRating?:  number[]
  tagIds?:      number[]
}

export interface PriceRange {
  label: string
  min:   number
  max:   number
}

export interface StarOption {
  value: number
  label: string
}

export interface FilterOptions {
  tags: {
    facility: Tag[]
    special:  Tag[]
  }
  starRatings: StarOption[]
  priceRanges: PriceRange[]
}

// ─── 接口响应 ─────────────────────────────────────────────────────────────────

export interface Pagination {
  current:  number
  pageSize: number
  total:    number
}

export interface HotelListResult {
  list:         Hotel[]
  pagination:   Pagination
  searchParams: Pick<SearchParams, 'checkIn' | 'checkOut' | 'nights' | 'rooms' | 'adults' | 'children'>
}

export interface ApiResponse<T> {
  code:     number
  message:  string
  data:     T
}

// ─── 前端专用 ─────────────────────────────────────────────────────────────────

export type SortType = 'default' | 'price_asc' | 'price_desc' | 'score'

export type AreaType = 'domestic' | 'international'

export type CalPhase = 'in' | 'out' | 'done'