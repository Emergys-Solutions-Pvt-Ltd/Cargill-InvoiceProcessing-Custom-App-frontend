import React, { useContext } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LanguageContext } from '../context/LanguageContext';

/** "1 - 10 of 50 items · Rows per page · Previous [1] of 5 Next" footer for server-paged tables. */
const Pager = ({ page, limit, totalItems, totalPages, loading, onPageChange, onLimitChange, sizes = [5, 10, 20] }) => {
  const { t } = useContext(LanguageContext);
  const start = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, totalItems);

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        {start} - {end} {t('ofItems', 'of {total} items').replace('{total}', totalItems)}
      </div>
      <div className="pagination-controls">
        <label style={{ marginRight: '0.25rem' }}>{t('rowsPerPage')}</label>
        <select
          className="input-field"
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value))}
          style={{ width: '70px', padding: '0.25rem 0.5rem', marginRight: '1rem' }}
        >
          {sizes.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        <button className="pagination-btn" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1 || loading}>
          <ChevronLeft size={16} /> {t('previous')}
        </button>
        <span className="pagination-page">{page}</span>
        <span className="pagination-of">{t('pageOfTotal', { totalPages })}</span>
        <button className="pagination-btn" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages || loading}>
          {t('next')} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pager;
