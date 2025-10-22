import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Imprint component - displays company legal information
 * This is a legal requirement for display but does not require user acceptance
 */
const Imprint: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className="text-xs text-center secondary-label-text space-y-1">
      <div className="font-semibold">{t('imprint.company', { defaultValue: 'RepCue B.V.' })}</div>
      <div>
        {t('imprint.kvk', { defaultValue: 'Chamber of Commerce (KvK)' })}: {t('imprint.kvkNumber', { defaultValue: '[KvK Number]' })}
      </div>
      <div>
        {t('imprint.vat', { defaultValue: 'VAT ID' })}: {t('imprint.vatNumber', { defaultValue: '[VAT Number]' })}
      </div>
      <div>
        {t('imprint.email', { defaultValue: 'Email' })}: <a href={`mailto:${t('imprint.contactEmail', { defaultValue: 'contact@repcue.com' })}`} className="text-primary-600 dark:text-primary-400 hover:underline">{t('imprint.contactEmail', { defaultValue: 'contact@repcue.com' })}</a>
      </div>
      <div className="text-xxs pt-1">
        {t('imprint.jurisdiction', { defaultValue: 'Jurisdiction: Netherlands' })}
      </div>
    </div>
  );
};

export default Imprint;
