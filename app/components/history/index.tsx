"use client"
import React from 'react';
import { DataGrid } from '@mui/x-data-grid/DataGrid';
import { expenseGrid, expenseRow } from '@/dummy';
import styles from './styles';

const index = () => {
  return (
    <div className={styles.container}>
      <p className={styles.header}>Expense History</p>
      <DataGrid
        rows={expenseRow}
        columns={expenseGrid}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 10,
            },
          },
        }}
        pageSizeOptions={[5]}
        disableRowSelectionOnClick
      />
    </div>
  )
}

export default index