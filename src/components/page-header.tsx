
"use client";

import * as React from "react";
import type { ReactNode } from "react";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

type BreadcrumbItemType = {
  label: string;
  href?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
  breadcrumbs,
}: {
  title:string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  breadcrumbs?: BreadcrumbItemType[];
}) {
  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 md:mb-8", className)}>
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div className="grid gap-1">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb className="mb-2">
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      {item.href && index < breadcrumbs.length - 1 ? (
                        <BreadcrumbLink asChild>
                          <Link href={item.href}>{item.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
