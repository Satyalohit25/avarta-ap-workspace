import { Shield, Users, FileCheck, Eye } from "lucide-react";
import type { CurrentUser } from "../api/auth";

export interface DemoAccountConfig {
  email: string;
  password: string;
  name: string;
  role: string;
  apiRole: string;
  icon: typeof Shield;
  color: string;
  bgColor: string;
}

export const DEMO_ACCOUNTS: DemoAccountConfig[] = [
  {
    email: "admin@avarta.dev",
    password: "password123",
    name: "Asha Administrator",
    role: "Administrator",
    apiRole: "ADMINISTRATOR",
    icon: Shield,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/40",
  },
  {
    email: "manager@avarta.dev",
    password: "password123",
    name: "Manav Manager",
    role: "Finance Manager",
    apiRole: "FINANCE_MANAGER",
    icon: Users,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  {
    email: "executive@avarta.dev",
    password: "password123",
    name: "Esha Executive",
    role: "Finance Executive",
    apiRole: "FINANCE_EXECUTIVE",
    icon: FileCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    email: "approver@avarta.dev",
    password: "password123",
    name: "Arjun Approver",
    role: "Approver",
    apiRole: "APPROVER",
    icon: Eye,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
  },
];

export const DEMO_USERS: Record<string, CurrentUser> = DEMO_ACCOUNTS.reduce(
  (acc, account, idx) => {
    acc[account.email] = {
      id: `usr-demo-0${idx + 1}`,
      name: account.name,
      email: account.email,
      organizationId: "org-acme-01",
      role: account.apiRole,
    };
    return acc;
  },
  {} as Record<string, CurrentUser>
);
