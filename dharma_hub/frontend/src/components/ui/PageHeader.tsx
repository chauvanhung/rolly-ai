"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
}

export default function PageHeader({ title, description, eyebrow = "☸" }: PageHeaderProps) {
  return (
    <header className="text-center space-y-3">
      <span className="text-2xl text-primary font-serif select-none" aria-hidden>
        {eyebrow}
      </span>
      <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
}
