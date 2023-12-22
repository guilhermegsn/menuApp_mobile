import { ProductData } from "./ProductMenu_Interface";

export interface OrderData {
  id: string,
  user: string,
  establishment: string,
  username: string,
  status: number,
  local: string,
  items: ProductData,
  date: Date,
}