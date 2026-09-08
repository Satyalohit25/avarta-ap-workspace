import { apiRequest } from "./client";

export interface SupplierListItem {
  id: string;
  supplierCode: string;
  displayName: string;
  legalName?: string;
  gstNumber?: string | null;
  country: string;
  currency: string;
  paymentTermsDays?: number;
  status: string;
  outstandingBalance: string;
  openInvoiceCount: number;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  panNumber?: string | null;
  msmeStatus?: string | null;
  category?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  paymentMethod?: string | null;
}

export function listSuppliers(params: { search?: string; status?: string } = {}) {
  return apiRequest<{ data: SupplierListItem[]; meta: unknown }>("/suppliers", { query: params });
}

export interface CreateSupplierInput {
  supplierCode: string;
  legalName: string;
  displayName: string;
  gstNumber?: string;
  country?: string;
  currency?: string;
  paymentTermsDays?: number;
  email?: string;
  phone?: string;
  address?: string;
  panNumber?: string;
  msmeStatus?: string;
  category?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentMethod?: string;
}

export function createSupplier(data: CreateSupplierInput) {
  return apiRequest<{ data: SupplierListItem }>("/suppliers", {
    method: "POST",
    body: data,
  });
}

