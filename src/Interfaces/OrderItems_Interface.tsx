import { ProductData } from "./ProductMenu_Interface";

export interface OrderItemsData {
  order_id: string,
  establishment: string,
  local: string,
  date: Date,
  items: ProductData,
  status: number
}