import React, { useId } from 'react';

/** Label + control; the label is linked to the control (id / htmlFor) for screen readers and clicks. */
export const Field = ({ label, children }) => {
  const id = useId();
  return (
    <div className="su-field">
      <label htmlFor={id}>{label}</label>
      {React.cloneElement(children, { id })}
    </div>
  );
};

export const ReadOnly = ({ id, value }) => <output id={id} className="su-readonly">{value || '–'}</output>;
