import data from "@/data/catalog.json";
import type {Settings,Category,Product} from "./types";
/** Public storefront snapshot only. No profiles, orders, balances or secrets. */
export const publicCatalog=data as {settings:Settings;categories:Category[];products:Product[];media:Record<string,string>};
