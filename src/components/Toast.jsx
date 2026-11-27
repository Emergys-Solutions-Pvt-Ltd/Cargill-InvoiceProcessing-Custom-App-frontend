import React, { useContext } from 'react';
import ButtonBase from '@mui/material/ButtonBase';
import { styled } from '@mui/material/styles';
import { LanguageContext } from '../context/LanguageContext';
import infoIcon from '../assets/icons/toast-info.svg';
import warningIcon from '../assets/icons/toast-warning.svg';
import dangerIcon from '../assets/icons/toast-danger.svg';
import successIcon from '../assets/icons/toast-success.svg';
import closeSvg from '../assets/icons/toast-close.svg';

/*
 * Toast message of the design system: Figma "LATAM Invoice Workflow" > Toast component (node 1:1978).
 * Colours are the --toast-* tokens of src/index.css; the icons are the Figma SVGs in src/assets/icons.
 * To show toasts from a screen use useToast() (src/context/ToastContext.js); this component is the visual only.
 *
 *   <Toast type="success" onClose={close}>{t('saved', 'Saved')}</Toast>
 *
 * type       info (default) | warning | danger | success
 * children   the message (usually a string)
 * onClose    shows the close button (Figma `closeIcon`) and is called when it is clicked
 * closeIcon  false hides the close button even when onClose is given
 * Everything else (className, sx, id, ref ...) goes to the root element.
 *
 * Long messages wrap up to 3 lines, then end with an ellipsis; the full text shows as a tooltip on hover.
 * Role: danger and warning are announced at once (role="alert"), info and success politely (role="status").
 */

// Figma gives Info and Warning the same "!" glyph: Info is that icon flipped vertically, so it reads as an "i"
const TYPES = {
  info: { icon: infoIcon, flip: true, role: 'status' },
  warning: { icon: warningIcon, flip: false, role: 'alert' },
  danger: { icon: dangerIcon, flip: false, role: 'alert' },
  success: { icon: successIcon, flip: false, role: 'status' },
};

// style-only props must not reach the DOM element
const STYLE_PROPS = new Set(['toastType', 'flip', 'ownerState', 'theme', 'sx', 'as']);
const keepProp = (prop) => !STYLE_PROPS.has(prop);

const Root = styled('div', { shouldForwardProp: keepProp })(({ toastType }) => ({
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  width: 400,
  maxWidth: 'calc(100vw - 48px)',
  // Figma draws the 1px border inside its 12px padding: 11px + 1px keeps the 400 x 45 size
  padding: 11,
  border: `1px solid var(--toast-${toastType}-border)`,
  borderRadius: 8,
  backgroundColor: `var(--toast-${toastType}-bg)`,
  color: 'var(--toast-text)',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.5,
}));

const Content = styled('div')({
  display: 'flex',
  flex: '1 1 0',
  minWidth: 0,
  alignItems: 'flex-start',
  gap: 8,
});

// 1.5px = (21px line - 18px icon) / 2: centred on a one-line message, aligned to the first line of a longer one
const Icon = styled('img', { shouldForwardProp: keepProp })(({ flip }) => ({
  display: 'block',
  flexShrink: 0,
  width: 18,
  height: 18,
  marginTop: 1.5,
  ...(flip && { transform: 'scaleY(-1)' }),
}));

const Message = styled('span')({
  flex: '1 1 0',
  minWidth: 0,
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
});

// 16px icon in a 24px hit area; the negative margins keep the icon where Figma draws it (first line, right edge)
const CloseButton = styled(ButtonBase)({
  flexShrink: 0,
  width: 24,
  height: 24,
  margin: '-1.5px -4px -4px',
  borderRadius: 4,
  '&.Mui-focusVisible': { outline: '2px solid var(--toast-text)' },
  '& img': { display: 'block', width: 16, height: 16 },
});

// the tooltip is only added when the text is cut off
const showFullText = (event) => {
  const el = event.currentTarget;
  el.title = el.scrollHeight > el.clientHeight + 1 ? el.textContent : '';
};

const Toast = ({ type = 'info', closeIcon = true, onClose, children, ...rest }) => {
  const { t } = useContext(LanguageContext);
  const kind = TYPES[type] ? type : 'info';
  const { icon, flip, role } = TYPES[kind];

  return (
    <Root toastType={kind} role={role} {...rest}>
      <Content>
        <Icon src={icon} alt="" flip={flip} />
        <Message onMouseEnter={showFullText}>{children}</Message>
      </Content>
      {closeIcon && onClose && (
        <CloseButton aria-label={t('close', 'Close')} onClick={onClose}>
          <img src={closeSvg} alt="" />
        </CloseButton>
      )}
    </Root>
  );
};

export default Toast;
