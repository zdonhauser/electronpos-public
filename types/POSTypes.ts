
export type KDSOrder = {
  pos_order_id: number | null;
  order_number: number | null;
  status: string | null;
  name?: string | null;
  items: KDSOrderItem[];
}

export type KDSOrderItem = {
  item_name: string;
  quantity: number;
  station: string;
  special_instructions: string | null;
  prepared_quantity: number;
  fulfilled_quantity: number;
};

export type GiftCard = {
  card_id: number;
  card_number: string;
  issued_to: string | null;
  items: string | null;
  is_donation: boolean;
  issue_timestamp: Date | null;
  redeem_timestamp: Date | null; 
  notes: string | null;
  paid_amount: number | null;
  original_value: number | null;
  current_value: number | null;
  value_history: number[] | null;  
  timestamp_history: Date[] | null;
  expiration: Date;
}


export type BillingAttempt = {
  id: number;
  date: string;
  status: string;
  order_id: string;
  error_code: string;
  error_message: string;
  triggered_manually: string;
};


type LogEntry = {
  content: string;
  created: string;
};


type SubscriptionItem = {
  id: number;
  product_id: string;
  variant_id: string;
  title: string;
  variant_sku: string;
  quantity: number;
  price: string;
  total_discount: string;
  discount_per_item: string;
  taxable: number;
  requires_shipping: number;
  original_price: string;
  original_amount: number;
  discount_value: number;
  discount_amount: number;
  final_price: number;
  final_amount: number;
  properties: { key: string; value: string }[];
  is_one_time_item: number;
  selling_plan_id: string;
  cycle_discounts: CycleDiscount[];
  discount_codes: any[]; // Define structure if available
};

type CycleDiscount = {
  base_price: string;
  computed_price: string;
  after_cycle: number;
};

export type Subscription = {
  id: number;
  order_placed: string;
  internal_id: number;
  delivery_interval: string;
  billing_interval: string;
  order_id: string;
  email: string;
  currency: string;
  first_name: string;
  last_name: string;
  s_first_name: string;
  s_last_name: string;
  s_address1: string;
  s_address2: string;
  s_phone: string;
  s_city: string;
  s_zip: string;
  s_province: string;
  s_country: string;
  s_company: string;
  s_country_code: string;
  s_province_code: string;
  b_first_name: string;
  b_last_name: string;
  b_address1: string;
  b_phone: string;
  b_city: string;
  b_zip: string;
  b_province: string;
  b_country: string;
  b_country_code: string;
  b_province_code: string;
  total_value: number;
  admin_note: string;
  subscription_type: number;
  status: string;
  customer_id: string;
  billing_min_cycles: number;
  billing_max_cycles: string;
  note: string;
  note_attributes: { key: string; value: string }[];
  edit_url: string;
  cancelled_on: string;
  paused_on: string;
  shopify_graphql_subscription_contract_id: string;
  card_brand: string;
  card_expiry_month: string;
  card_expiry_year: string;
  card_last_digits: string;
  items: SubscriptionItem[];
  billing_attempts: BillingAttempt[];
  invoices: any[]; // Define structure if available
  fulfillment_orders: any[]; // Define structure if available
  tags: string[];
  log: LogEntry[];
};



export interface Member {
  membership_number?: number;
  name?: string;
  membership_type?: string;
  status?: string;
  term?: string;
  due_date?: Date | null;
  contract_end_date?:  Date | null;
  contract_start_date?:  Date | null;
  signup_date?:  Date | null;
  visits?: number;
  dob?: Date | null;
  age?: number | null;
  due_date_1?: Date | null;
  address_line_1?: string | null;
  city_state_zip?: string | null;
  comment?: string | null;
  alert?: string | null;
  note?: string | null;
  email?: string | null;
  responsible_member?: string | null;
  barcode?: number | null;
  contact?: string | null;
  photo?: string | null;
  valid_until?:Date|null;
  sub_id?:number|null;
  payment_amount?:number;
  payments_remaining?:number;
  edit_url?:string;
  next_payment?:Date|null;
  valid_starting?:Date|null;
  visits_array?:Date[];
  last_visit?:Date;
  _seal_selling_plan_id?: string;
  hasPhoto?:boolean;
  visitsToday?:number;
  totalPaid?:number;
  former_sub_id?:number;
}

export type ExtendedLineItem = LineItem & Member & {
  fullPrice?: number;
  discountType?: string;
  modClass?: number;
  numOfMods?: number;
  isMod?: boolean;
  addPrice?: number;
  group?: number;
  function?:string;
  order?:Order;
  max_quantity?:number;
  mod?: number;
  mod_type?:string;
  required_mods?:number[];
  optional_mods?:number[];
  redeemed?:Date;
  subtitle?:string;
};






export type MoneySet = {
  shop_money?: {
    amount?: string;
    currency_code?: string;
  };
  presentment_money?: {
    amount?: string;
    currency_code?: string;
  };
};

export type Address = {
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
  name?: string; // Full name
  province_code?: string;
  country_code?: string;
  country_name?: string;
  default?: boolean;
};

export type TaxLine = {
  channel_liable?: any;
  price?: number;
  price_set?: MoneySet;
  rate?: number;
  title?: string;
};

export type LineItemProperty = {
  addPrice: number;
  name: string;
  value: string;
};

export type LineItem = {
  id?: number;
  admin_graphql_api_id?: string;
  fulfillable_quantity?: number;
  fulfillment_service?: string;
  fulfillment_status?: any;
  gift_card?: boolean;
  grams?: number;
  name?: string;
  price?: number;
  price_set?: MoneySet;
  product_exists?: boolean;
  product_id?: any;
  properties?: LineItemProperty[];
  quantity?: number;
  requires_shipping?: boolean;
  sku?: string;
  taxable?: boolean;
  title?: string;
  total_discount?: number;
  total_discount_set?: MoneySet;
  variant_id?: any;
  variant_inventory_management?: any;
  variant_title?: any;
  vendor?: any;
  tax_lines?: TaxLine[];
  duties?: any[];
  discount_allocations?: any[];
};
export type MarketingConsent = {
  state?: "subscribed" | "unsubscribed";
  opt_in_level?: "confirmed_opt_in" | "single_opt_in";
  consent_updated_at?: string;
  consent_collected_from?: string;
};

export type Metafield = {
  key?: string;
  namespace?: string;
  value?: string;
  type?: string;
};

export type Customer = {
  accepts_marketing?: boolean;
  accepts_marketing_updated_at?: string;
  addresses?: Address[];
  currency?: string;
  created_at?: string;
  default_address?: Address;
  email?: string;
  email_marketing_consent?: MarketingConsent;
  first_name?: string;
  id?: number;
  last_name?: string;
  last_order_id?: number;
  last_order_name?: string;
  metafield?: Metafield;
  marketing_opt_in_level?: "confirmed_opt_in" | "single_opt_in";
  multipass_identifier?: string | null;
  note?: string;
  orders_count?: number;
  password?: string;
  password_confirmation?: string;
  phone?: string;
  sms_marketing_consent?: MarketingConsent;
  state?: "enabled" | "disabled";
  tags?: string;
  tax_exempt?: boolean;
  tax_exemptions?: string[];
  total_spent?: string;
  updated_at?: string;
  verified_email?: boolean;
  company?:string;
};


export type Money = {
  amount?: string;
  currency_code?: string;
};


export type Duty = {
  id?: string;
  harmonized_system_code?: string;
  country_code_of_origin?: string;
  shop_money?: Money;
  presentment_money?: Money;
  tax_lines?: TaxLine[];
  admin_graphql_api_id?: string;
};



export type Receipt = {
  testcase?: boolean;
  authorization?: string;
};

export type Fulfillment = {
  created_at?: string;
  id?: number;
  line_items?: LineItem[];
  location_id?: number;
  name?: string;
  notify_customer?: boolean;
  order_id?: number;
  origin_address?: Address[];
  receipt?: Receipt;
  service?: string;
  shipment_status?: string;
  status?: string;
  tracking_company?: string;
  tracking_numbers?: string[];
  tracking_number?: string;
  tracking_urls?: string[];
  tracking_url?: string;
  updated_at?: string;
  variant_inventory_management?: string;
};


export type ShippingLine = {
  title?: string;
  price?: string;
  code?: string;
  source?: string;
  phone?: string;
  requested_fulfillment_service_id?: any;
  delivery_category?: any;
  carrier_identifier?: any;
  discount_allocations?: any[];
};

export type DiscountApplication = {
  allocation_method?: "across" | "each" | "one";
  code?: string;
  description?: string;
  target_selection?: "all" | "entitled" | "explicit";
  target_type?: "line_item" | "shipping_line";
  title?: string;
  type?: "automatic" | "discount_code" | "manual" | "script";
  value?: number;
  value_type?: "fixed_amount" | "percentage";
};


export type OrderAdjustment = {
  id: number;
  order_id: number;
  refund_id: number;
  amount: string;
  tax_amount: string;
  kind: string;
  reason: string;
  amount_set: {
    shop_money: Money;
    presentment_money: Money;
  };
  tax_amount_set: {
    shop_money: Money;
    presentment_money: Money;
  };
};

export type RefundDuty = {
  duty_id: number;
  refund_type: any;
};

export type RefundLineItem = {
  id: number;
  line_item: LineItem;
  line_item_id: number;
  quantity: number;
  location_id: number;
  restock_type: any;
  subtotal: number;
  total_tax: number;
  subtotal_set: {
    shop_money: Money;
    presentment_money: Money;
  };
  total_tax_set: {
    shop_money: Money;
    presentment_money: Money;
  };
};

export type Transaction = {
  amount?: number;
  authorization?: string;
  authorization_expires_at?: string; // ISO 8601 format
  created_at?: string; // ISO 8601 format
  currency?: string; // ISO 4217 format
  device_id?: number;
  error_code?: string; 
  extended_authorization_attributes?: ExtendedAuthorizationAttributes;
  gateway?: string;
  id?: number;
  kind?: 'authorization' | 'capture' | 'sale' | 'void' | 'refund' | 'change';
  location_id?: LocationId;
  message?: string;
  order_id?: number;
  payment_details?: PaymentDetails;
  parent_id?: number;
  payments_refund_attributes?: PaymentsRefundAttributes;
  processed_at?: string; // ISO 8601 format
  receipt?: Record<string, unknown>;
  source_name?: string;
  status?: 'pending' | 'failure' | 'success' | 'error';
  total_unsettled_set?: TotalUnsettledSet;
  test?: boolean;
  user_id?: number;
  currency_exchange_adjustment?: CurrencyExchangeAdjustment;
};

export type ExtendedAuthorizationAttributes = {
  standard_authorization_expires_at?: string; // ISO 8601 format
  extended_authorization_expires_at?: string; // ISO 8601 format
};

export type LocationId = {
  id?: number;
};

export type PaymentDetails = {
  credit_card_bin?: string;
  avs_result_code?: string;
  cvv_result_code?: string;
  credit_card_number?: string;
  credit_card_company?: string;
  credit_card_name?: string;
  credit_card_wallet?: string;
  credit_card_expiration_month?: number;
  credit_card_expiration_year?: number;
  buyer_action_info?: BuyerActionInfo;
  payment_method_name?: string;
};

export type BuyerActionInfo = {
  multibanco?: Multibanco;
};

export type Multibanco = {
  Entity?: string;
  Reference?: string;
};

export type PaymentsRefundAttributes = {
  status?: string;
  acquirer_reference_number?: string;
};

export type TotalUnsettledSet = {
  presentment_money?: Money;
  shop_money?: Money;
};


export type CurrencyExchangeAdjustment = {
  id?: number;
  adjustment?: string;
  original_amount?: string;
  final_amount?: string;
  currency?: string;
};


// Main Refund resource:

export type Refund = {
  created_at: string;
  duties?: {
    duties: Duty[];
  };
  id: number;
  note: string;
  order_adjustments: OrderAdjustment[];
  processed_at: string;
  refund_duties: RefundDuty[];
  refund_line_items: RefundLineItem[];
  restock: boolean;
  transactions: Transaction[];
  user_id: number;
};


export type DiscountCode = {
  amount: number;
  code: string;
  type: 'fixed_amount' | 'percentage' | 'shipping';
};


export type Order = {
  id?: number;
  admin_graphql_api_id?: string;
  app_id?: number;
  browser_ip?: any;
  buyer_accepts_marketing?: boolean;
  cancel_reason?: any;
  cancelled_at?: any;
  cart_token?: any;
  checkout_id?: any;
  checkout_token?: any;
  client_details?: any;
  closed_at?: any;
  confirmation_number?: string;
  confirmed?: boolean;
  contact_email?: any;
  created_at?: string;
  currency?: string;
  current_subtotal_price?: number;
  current_subtotal_price_set?: MoneySet;
  current_total_additional_fees_set?: any;
  current_total_discounts?: number;
  current_total_discounts_set?: MoneySet;
  current_total_duties_set?: Duty[];
  current_total_price?: number;
  current_total_price_set?: MoneySet;
  current_total_tax?: number;
  current_total_tax_set?: MoneySet;
  customer_locale?: any;
  device_id?: any;
  discount_codes?: DiscountCode[];
  email?: string;
  estimated_taxes?: boolean;
  financial_status?: string;
  fulfillment_status?: any;
  landing_site?: any;
  landing_site_ref?: any;
  location_id?: any;
  merchant_of_record_app_id?: any;
  name?: string;
  note?: any;
  note_attributes?: any[];
  number?: number;
  order_number?: number;
  order_status_url?: string;
  original_total_additional_fees_set?: any;
  original_total_duties_set?: Duty[];
  payment_gateway_names?: string[];
  phone?: any;
  po_number?: any;
  presentment_currency?: string;
  processed_at?: string;
  reference?: any;
  referring_site?: any;
  source_identifier?: any;
  source_name?: string;
  source_url?: any;
  subtotal_price?: number;
  subtotal_price_set?: MoneySet;
  tags?: string;
  tax_exempt?: boolean;
  tax_lines?: TaxLine[];
  taxes_included?: boolean;
  test?: boolean;
  token?: string;
  total_discounts?: string;
  total_discounts_set?: MoneySet;
  total_line_items_price?: string;
  total_line_items_price_set?: MoneySet;
  total_outstanding?: number;
  total_price?: number;
  total_price_set?: MoneySet;
  total_shipping_price_set?: MoneySet;
  total_tax?: number;
  total_tax_set?: MoneySet;
  total_tip_received?: string;
  total_weight?: number;
  updated_at?: string;
  user_id?: any;
  billing_address?: Address;
  customer?: any;
  discount_applications?: DiscountApplication[];
  fulfillments?: any[];
  line_items?: LineItem[];
  payment_terms?: any;
  refunds?: Refund[];
  shipping_address?: Address;
  shipping_lines?: any[];
  transactions?: Transaction[];
};

export interface User {
  name: string;
  pin: string;
  auth: string;
}


export interface POSProps {
  user:User;
  directoryHandle:FileSystemDirectoryHandle;
  isBFF:boolean;
  // Define the props passed to the POSWindow component
  // Example: user: { name: string; pin: string };
}



/* REMOVED , from previous graphQL implementation:

export interface Customer {
    name: string;
    pin: string;
    auth: string;
    // Define the properties of the customer object
    // Example: name: string;
  }
  


  
  export type AppliedDiscount = {
    amount?: string;
    description?: string;
    title?: string;
    value: number;
    valueType: "FIXED_AMOUNT" | "PERCENTAGE";
  };
  
  export type CustomAttribute = {
    key: string;
    value: string;
  };
  
  export type Weight = {
    unit?: string;
    value?: number;
  };
  
  export type Address = {
    address1?: string;
    address2?: string;
    city?: string;
    company?: string;
    country?: string;
    countryCode?: string;
    firstName?: string;
    id?: string;
    lastName?: string;
    phone?: string;
    province?: string;
    provinceCode?: string;
    zip?: string;
  };

  export type RESTAddress = {
    address1?: string;
    address2?: string;
    city?: string;
    company?: string;
    country?: string;
    country_code?: string;
    first_name?: string;
    id?: number;
    last_name?: string;
    phone?: string;
    province?: string;
    province_code?: string;
    zip?: string;
  };

  
  export type Metafield = {
    description?: string;
    id?: string;
    key?: string;
    namespace?: string;
    type?: string;
    value?: string;
  };
  
  export type ValueInput = {
    value?: string;
    valueType?: string;
  };
  
  export type PrivateMetafield = {
    key?: string;
    namespace?: string;
    owner?: string;
    valueInput?: ValueInput;
  };
  
  export type PaymentSchedule = {
    dueAt?: string;
    issuedAt?: string;
  };
  
  export type PaymentTerms = {
    paymentSchedules?: PaymentSchedule[];
    paymentTermsTemplateId?: string;
  };
  
  export type PurchasingCompany = {
    companyContactId?: string;
    companyId?: string;
    companyLocationId?: string;
  };
  
  export type PurchasingEntity = {
    customerId?: string;
    purchasingCompany?: PurchasingCompany;
  };
  
  export type ShippingLine = {
    price?: string;
    shippingRateHandle?: string;
    title?: string;
  };
  
  export type LineItemBase = {
    appliedDiscount?: AppliedDiscount;
    customAttributes?: CustomAttribute[];
    grams?: number;
    originalUnitPrice?: number;
    quantity: number;
    requiresShipping?: boolean;
    sku?: string;
    taxable?: boolean;
  };
  
  export type LineItemWithTitle = LineItemBase & {
    title: string;
    variantId?: string;
  };
  
  export type LineItemWithVariantId = LineItemBase & {
    title?: string;
    variantId: string;
  };
  
  export type LineItem = LineItemWithTitle | LineItemWithVariantId;
  
  export type Input = {
    appliedDiscount?: AppliedDiscount;
    billingAddress?: Address;
    customAttributes?: CustomAttribute[];
    email?: string;
    lineItems?: LineItem[];
    localizationExtensions?: CustomAttribute[];
    marketRegionCountryCode?: string;
    metafields?: Metafield[];
    note?: string;
    paymentTerms?: PaymentTerms;
    phone?: string;
    poNumber?: string;
    presentmentCurrencyCode?: string;
    privateMetafields?: PrivateMetafield[];
    purchasingEntity?: PurchasingEntity;
    reserveInventoryUntil?: string;
    shippingAddress?: Address;
    shippingLine?: ShippingLine;
    sourceName?: string;
    tags?: string[];
    taxExempt?: boolean;
    useCustomerDefaultAddress?: boolean;
    visibleToCustomer?: boolean;
  };
  
  export type Order = {
    id?: string;
    input: Input;
  };

  export type ExtendedLineItem = LineItem & {
    [key: string]: any;
  };
  */