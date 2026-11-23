import { createTheme } from '@mui/material/styles';

/**
 * MUI theme matching the Cargill palette of src/index.css (:root variables). MUI needs real colour values
 * (it computes hover / alpha shades), so keep these in sync with index.css when the palette changes.
 */
export const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#167a3c', dark: '#11612f', contrastText: '#ffffff' },
    error: { main: '#c0392b' },
    success: { main: '#16a34a' },
    info: { main: '#2563eb' },
    text: { primary: '#1f2328', secondary: '#6b6b6b', disabled: '#8a8a8a' },
    background: { default: '#fbf9f5', paper: '#ffffff' },
    divider: '#e6e3dd',
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: 14,
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 10 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 10 } } },
  },
});
