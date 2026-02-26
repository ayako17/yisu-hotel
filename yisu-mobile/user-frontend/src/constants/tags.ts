// constants/tags.ts

export interface Tag {
  id: number
  name: string
  tag_type: 'facility' | 'special'
  sort_order: number
}

// 设施标签
export const FACILITY_TAGS: Tag[] = [
  { id:1,  name:'免费停车场', tag_type:'facility', sort_order:1 },
  { id:2,  name:'健身房',     tag_type:'facility', sort_order:2 },
  { id:3,  name:'游泳池',     tag_type:'facility', sort_order:3 },
  { id:4,  name:'免费Wi-Fi', tag_type:'facility', sort_order:4 },
  { id:5,  name:'会议厅',     tag_type:'facility', sort_order:5 },
  { id:6,  name:'餐厅',       tag_type:'facility', sort_order:6 },
  { id:7,  name:'酒吧',       tag_type:'facility', sort_order:7 },
  { id:8,  name:'商务中心',   tag_type:'facility', sort_order:8 },
  { id:9,  name:'Spa',        tag_type:'facility', sort_order:9 },
]

// 特色标签
export const SPECIAL_TAGS: Tag[] = [
  { id:10, name:'亲子首选',   tag_type:'special', sort_order:1 },
  { id:11, name:'极速入住',   tag_type:'special', sort_order:2 },
  { id:12, name:'园林景观',   tag_type:'special', sort_order:3 },
  { id:13, name:'宠物友好',   tag_type:'special', sort_order:4 },
  { id:14, name:'设计师酒店', tag_type:'special', sort_order:5 },
  { id:15, name:'近地铁站',   tag_type:'special', sort_order:6 },
  { id:16, name:'江景/湖景', tag_type:'special', sort_order:7 },
  { id:17, name:'温泉',       tag_type:'special', sort_order:8 },
]