import React, { useContext } from 'react';
import TablePagination from '@mui/material/TablePagination';
import { LanguageContext } from '../context/LanguageContext';

/**
 * "Rows per page · 1 - 10 of 50 items · ‹ ›" footer for server-paged tables (MUI TablePagination).
 * Props keep the old 1-based `page`; MUI's is 0-based.
 */
const Pager = ({ page, limit, totalItems, totalPages, loading, onPageChange, onLimitChange, sizes = [5, 10, 20] }) => {
  const { t } = useContext(LanguageContext);

  return (
    <TablePagination
      component="div"
      className="pt-[0.6rem]"
      count={totalItems}
      page={totalItems === 0 ? 0 : Math.min(page - 1, Math.max(totalPages - 1, 0))}
      rowsPerPage={limit}
      rowsPerPageOptions={sizes}
      onPageChange={(_e, next) => onPageChange(next + 1)}
      onRowsPerPageChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
      labelRowsPerPage={t('rowsPerPage')}
      labelDisplayedRows={({ from, to, count }) => `${from} - ${to} ${t('ofItems', 'of {total} items').replace('{total}', count)}`}
      getItemAriaLabel={(type) => (type === 'previous' ? t('previous') : t('next'))}
      slotProps={{
        actions: {
          previousButton: { disabled: page <= 1 || loading },
          nextButton: { disabled: page >= totalPages || loading },
        },
      }}
    />
  );
};

export default Pager;
