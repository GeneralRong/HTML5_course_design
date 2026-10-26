export const CATEGORIES = [
  { value: 'umbrella', text: '雨伞' },
  { value: 'keys', text: '钥匙' },
  { value: 'card', text: '校园卡/证件' },
  { value: 'electronics', text: '电子设备' },
  { value: 'cup', text: '水杯' },
  { value: 'bag', text: '包/钱包' },
  { value: 'clothes', text: '衣物' },
  { value: 'book', text: '书籍/资料' },
  { value: 'jewelry', text: '饰品' },
  { value: 'other', text: '其他' },
]

export const COLORS = ['黑色', '白色', '灰色', '蓝色', '红色', '黄色', '绿色', '粉色', '紫色', '棕色', '银色', '其他']

export const PLACES = ['教学楼', '图书馆', '食堂', '宿舍', '操场', '体育馆', '校门口', '路上', '其他']

export const textOf = (list, v) => (list.find(i => i.value === v)?.text ?? v)

export const STATUS = {
  open: { text: '进行中', type: 'success' },
  pending: { text: '待确认', type: 'warning' },
  closed: { text: '已完成', type: 'default' },
}
