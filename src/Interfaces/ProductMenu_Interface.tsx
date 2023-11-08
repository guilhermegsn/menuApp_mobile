export interface MenuData {
  id: string
  name: string
  urlImg: string
  items: ProductData[]
}

export interface ProductData {
  id: string
  name: string
  description: string
  price: Number
}