import { Home, Users, CreditCard, Settings, Package } from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  // icon: React.ElementType;
};
export type NavBox = {
  title?: string;
  items?: NavItem[];
};
type Role = "OWNER" | "LEADER" | "CALLER" | "TEAM" | "OTHER";

export const navByRole: Record<Role, NavBox[]> = {
  OWNER: [
    {
      title: "Dashboards",
      items: [
        {
          id: "leadsDashboard",
          href: "/owner",
          label: "Dashboard",
        },
        {
          id: "WebsiteDashboard",
          href: "/dashboard",
          label: "Website Leads",
        },
      ],
    },
    {
      title: "Listings",
      items: [
        { id: "all", href: "/listings", label: "All" },
        { id: "autotrader", href: "/listings/autotrader", label: "Autotrader" },
        { id: "kijiji", href: "/listings/kijiji", label: "Kijiji" },
        {
          id: "finder",
          href: "/listings/finder",
          label: "Carflex Finder",
        },
        {
          id: "marketplace",
          href: "/listings/marketplace",
          label: "Swoopa Marketplace",
        },
        {
          id: "facebook",
          href: "/listings/facebook",
          label: "Facebook Marketplace",
        },
      ],
    },
    {
      title: "Sheets",
      items: [
        {
          id: "leadersSheet",
          label: "Leaders Sheet",
          href: "/leaders/sheet",
        },
        {
          id: "callerSheet",
          label: "Callers Sheet",
          href: "/caller/sheet",
        },
      ],
    },
    {
      title: "VIN",
      items: [
        {
          id: "vin-decoder",
          href: "/vin-decoder",
          label: "Vin Decoder",
        },
      ],
    },
  ],
  LEADER: [
    {
      items: [
        {
          id: "WebsiteDashboard",
          href: "/dashboard",
          label: "Website Leads",
        },
      ],
    },
    {
      title: "Listings",
      items: [
        { id: "all", href: "/listings", label: "All" },
        { id: "autotrader", href: "/listings/autotrader", label: "Autotrader" },
        { id: "kijiji", href: "/listings/kijiji", label: "Kijiji" },
        {
          id: "finder",
          href: "/listings/finder",
          label: "Carflex Finder",
        },
        {
          id: "marketplace",
          href: "/listings/marketplace",
          label: "Swoopa Marketplace",
        },
        {
          id: "facebook",
          href: "/listings/facebook",
          label: "Facebook Marketplace",
        },
      ],
    },
    {
      title: "Sheets",
      items: [
        {
          id: "leadersSheet",
          label: "Leaders Sheet",
          href: "/leaders/sheet",
        },
        {
          id: "callerSheet",
          label: "Callers Sheet",
          href: "/caller/sheet",
        },
      ],
    },
    {
      title: "VIN",
      items: [
        {
          id: "vin-decoder",
          href: "/vin-decoder",
          label: "Vin Decoder",
        },
      ],
    },
  ],
  CALLER: [
    {
      items: [
        {
          id: "WebsiteDashboard",
          href: "/dashboard",
          label: "Website Leads",
        },
      ],
    },
    {
      title: "Listings",
      items: [
        { id: "all", href: "/listings", label: "All" },
        { id: "autotrader", href: "/listings/autotrader", label: "Autotrader" },
        { id: "kijiji", href: "/listings/kijiji", label: "Kijiji" },
        {
          id: "finder",
          href: "/listings/finder",
          label: "Carflex Finder",
        },
        {
          id: "marketplace",
          href: "/listings/marketplace",
          label: "Swoopa Marketplace",
        },
        {
          id: "facebook",
          href: "/listings/facebook",
          label: "Facebook Marketplace",
        },
      ],
    },
    {
      title: "Sheets",
      items: [
        {
          id: "callerSheet",
          label: "Caller Sheet",
          href: "/caller/sheet",
        },
      ],
    },
    {
      title: "VIN",
      items: [
        {
          id: "vin-decoder",
          href: "/vin-decoder",
          label: "Vin Decoder",
        },
      ],
    },
  ],
  TEAM: [
    {
      title: "Listings",
      items: [
        { id: "all", href: "/listings", label: "All" },
        { id: "autotrader", href: "/listings/autotrader", label: "Autotrader" },
        { id: "kijiji", href: "/listings/kijiji", label: "Kijiji" },
        {
          id: "finder",
          href: "/listings/finder",
          label: "Carflex Finder",
        },
        {
          id: "marketplace",
          href: "/listings/marketplace",
          label: "Swoopa Marketplace",
        },
        {
          id: "facebook",
          href: "/listings/facebook",
          label: "Facebook Marketplace",
        },
      ],
    },
    {
      title: "VIN",
      items: [
        {
          id: "vin-decoder",
          href: "/vin-decoder",
          label: "Vin Decoder",
        },
      ],
    },
  ],
  OTHER: [
    {
      title: "Listings",
      items: [
        { id: "all", href: "/listings", label: "All" },
        { id: "autotrader", href: "/listings/autotrader", label: "Autotrader" },
        { id: "kijiji", href: "/listings/kijiji", label: "Kijiji" },
        {
          id: "finder",
          href: "/listings/finder",
          label: "Carflex Finder",
        },
        {
          id: "marketplace",
          href: "/listings/marketplace",
          label: "Swoopa Marketplace",
        },
        {
          id: "facebook",
          href: "/listings/facebook",
          label: "Facebook Marketplace",
        },
      ],
    },
    {
      title: "VIN",
      items: [
        {
          id: "vin-decoder",
          href: "/vin-decoder",
          label: "Vin Decoder",
        },
      ],
    },
  ],
};
