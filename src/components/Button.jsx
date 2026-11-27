import React from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import { styled } from '@mui/material/styles';

/*
 * Generic Button of the design system: Figma "LATAM Invoice Workflow" > Buttons (node 1:1465).
 * Colours are the --btn-* tokens of src/index.css (Figma palette, kept apart from the app palette).
 *
 *   <Button startIcon={<Plus />} endIcon={<ChevronDown />}>{t('add', 'Add')}</Button>
 *   <Button variant="secondary" color="danger" size="sm" onClick={remove}>{t('delete', 'Delete')}</Button>
 *   <Button variant="link" component={Link} to="/settings/users">{t('usersMenu', 'Users')}</Button>
 *
 * variant  primary (default) | secondary | tertiary | link
 * color    default | neutral | danger
 *            Figma's "Cancel" state is color="neutral" and "Delete" is color="danger" (primary / secondary only;
 *            tertiary and link support default | danger). Hover and Disabled of these two are not in Figma:
 *            they are derived tokens, see index.css.
 * size     xs | sm | md | lg. Default md; tertiary defaults to xs and link to md, the only sizes Figma draws for them.
 * startIcon / endIcon  an icon element (e.g. lucide-react); sized by the button (16 / 16 / 20 / 24 px).
 * Hover, Disabled (`disabled`) and keyboard focus (visible ring, not in Figma) come from the variant.
 * Everything else (onClick, type, aria-*, href, component, className, sx, ref) goes to MUI ButtonBase;
 * `type` defaults to "button", pass type="submit" in forms.
 * No icon-only variant: it needs an aria-label and is not in Figma.
 */

// Primary / Secondary scale (Figma X-Small, Small, Medium, Large), in px
const SIZES = {
  xs: { fontSize: 12, padX: 12, padY: 8, icon: 16 },
  sm: { fontSize: 14, padX: 12, padY: 8, icon: 16 },
  md: { fontSize: 14, padX: 20, padY: 10, icon: 20 },
  lg: { fontSize: 16, padX: 20, padY: 12, icon: 24 },
};

// Tertiary and Text Link are drawn at one size each, with their own type scale; other sizes fall back to SIZES
const TEXT_SCALES = {
  tertiary: { xs: { fontSize: 12, icon: 18, height: 19 } },
  link: { md: { fontSize: 16, icon: 20, height: 19 } },
};

const DEFAULT_SIZE = { primary: 'md', secondary: 'md', tertiary: 'xs', link: 'md' };

// Primary: solid fill, white text
const SOLID = {
  default: { bg: 'var(--btn-primary)', hover: 'var(--btn-primary-hover)', disabled: 'var(--btn-primary-disabled)' },
  neutral: { bg: 'var(--btn-neutral)', hover: 'var(--btn-neutral-hover)', disabled: 'var(--btn-neutral-disabled)' },
  danger: { bg: 'var(--btn-danger)', hover: 'var(--btn-danger-hover)', disabled: 'var(--btn-danger-disabled)' },
};

// Secondary: light fill, 1px border and text in the same colour
const TINTED = {
  default: { bg: 'var(--btn-primary-light)', line: 'var(--btn-primary)', hover: 'var(--btn-primary-light-hover)', disabled: 'var(--btn-primary-muted)' },
  neutral: { bg: 'var(--btn-neutral-light)', line: 'var(--btn-neutral)', hover: 'var(--btn-neutral-light-hover)', disabled: 'var(--btn-neutral-disabled)' },
  danger: { bg: 'var(--btn-danger-light)', line: 'var(--btn-danger)', hover: 'var(--btn-danger-light-hover)', disabled: 'var(--btn-danger-disabled)' },
};

// Tertiary and Text Link: text only
const TEXT = {
  tertiary: {
    default: { color: 'var(--btn-neutral-text)', hover: 'var(--btn-primary)', disabled: 'var(--btn-neutral-muted)' },
    danger: { color: 'var(--btn-danger)', hover: 'var(--btn-danger-hover)', disabled: 'var(--btn-danger-disabled)' },
  },
  link: {
    default: { color: 'var(--btn-primary)', hover: 'var(--btn-primary-hover)', disabled: 'var(--btn-primary-muted)' },
    danger: { color: 'var(--btn-danger)', hover: 'var(--btn-danger-hover)', disabled: 'var(--btn-danger-disabled)' },
  },
};

const FOCUS_RING = { default: 'var(--btn-primary)', neutral: 'var(--btn-neutral)', danger: 'var(--btn-danger)' };

const rootStyles = ({ appearance, tone, scale }) => {
  const isText = appearance === 'tertiary' || appearance === 'link';
  const size = { ...SIZES[scale], ...TEXT_SCALES[appearance]?.[scale] };

  const base = {
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isText ? 4 : 8,
    margin: 0,
    fontFamily: 'inherit',
    fontSize: size.fontSize,
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: 0,
    textTransform: 'none',
    whiteSpace: 'nowrap',
    borderRadius: 4,
    transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
    '& .button-icon': { display: 'inline-flex', flexShrink: 0 },
    '& .button-icon > svg': { width: size.icon, height: size.icon },
    '&.Mui-focusVisible': { outline: `2px solid ${FOCUS_RING[tone] ?? FOCUS_RING.default}`, outlineOffset: 2 },
  };

  if (isText) {
    const c = TEXT[appearance][tone] ?? TEXT[appearance].default;
    return {
      ...base,
      padding: 0,
      height: size.height,
      color: c.color,
      '&:hover': { color: c.hover, textDecoration: appearance === 'link' ? 'underline' : 'none' },
      '&.Mui-disabled': { color: c.disabled },
    };
  }

  if (appearance === 'secondary') {
    const c = TINTED[tone] ?? TINTED.default;
    return {
      ...base,
      // the 1px border sits inside the Figma frame: take it off the padding so Primary and Secondary have the same size
      padding: `${size.padY - 1}px ${size.padX - 1}px`,
      border: `1px solid ${c.line}`,
      color: c.line,
      backgroundColor: c.bg,
      '&:hover': { backgroundColor: c.hover },
      '&.Mui-disabled': { backgroundColor: c.bg, borderColor: c.disabled, color: c.disabled },
    };
  }

  const c = SOLID[tone] ?? SOLID.default;
  return {
    ...base,
    padding: `${size.padY}px ${size.padX}px`,
    border: 0,
    color: '#ffffff',
    backgroundColor: c.bg,
    '&:hover': { backgroundColor: c.hover },
    '&.Mui-disabled': { backgroundColor: c.disabled, color: '#ffffff' },
  };
};

// appearance / tone / scale style the button and must not reach the DOM element
const STYLE_PROPS = new Set(['appearance', 'tone', 'scale', 'ownerState', 'theme', 'sx', 'as']);
const Root = styled(ButtonBase, { shouldForwardProp: (prop) => !STYLE_PROPS.has(prop) })(rootStyles);

const Button = ({ variant = 'primary', color = 'default', size, startIcon, endIcon, children, ...rest }) => {
  const appearance = DEFAULT_SIZE[variant] ? variant : 'primary';
  const scale = SIZES[size] ? size : DEFAULT_SIZE[appearance];

  return (
    <Root appearance={appearance} tone={color} scale={scale} disableRipple {...rest}>
      {startIcon && <span className="button-icon" aria-hidden="true">{startIcon}</span>}
      {children}
      {endIcon && <span className="button-icon" aria-hidden="true">{endIcon}</span>}
    </Root>
  );
};

export default Button;
