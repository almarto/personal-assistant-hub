'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { ChangeEvent, useTransition } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Common');

  const onSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = e.target.value;
    startTransition(() => {
      router.replace(pathname, {locale: nextLocale});
    });
  };

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{t('language')}</span>
      <select
        defaultValue={locale}
        disabled={isPending}
        onChange={onSelectChange}
        className="p-2 border rounded bg-background text-foreground"
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    </label>
  );
}