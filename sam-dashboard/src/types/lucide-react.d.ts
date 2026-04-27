declare module "lucide-react" {
  import * as React from "react";
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }
  export const LayoutDashboard: React.FC<LucideProps>;
  export const Menu: React.FC<LucideProps>;
  export const ChevronDown: React.FC<LucideProps>;
  export const Activity: React.FC<LucideProps>;
  export const ChevronLeft: React.FC<LucideProps>;
  export const ChevronRight: React.FC<LucideProps>;
  export const LogOut: React.FC<LucideProps>;
  export const Download: React.FC<LucideProps>;
}
