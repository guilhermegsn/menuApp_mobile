export interface MenuData {
  id: string
  name: string
  urlImg: string | null
  items: ProductData[]
}

export interface ProductData {
  id: string
  name: string
  description: string
  price: Number
  strPrice: string
}

export interface ItemCartData {
  product: ProductData
  qty: number
}