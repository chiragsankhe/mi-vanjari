import { toast } from 'sonner';

/**
 * Use as the second argument of react-hook-form's handleSubmit: tells the person which field is wrong
 * (instead of the Save button silently doing nothing) and moves the cursor there.
 *   form.handleSubmit(save, onInvalid(form, { description: 'Description' }))
 */
export const onInvalid = (form, labels = {}) => (errors) => {
  const [name, err] = Object.entries(errors)[0] || [];
  if (!name) return;
  toast.error(`${labels[name] || name}: ${err?.message || 'please check this field'}`);
  try {
    form.setFocus(name);
  } catch {
    /* field has no focusable input */
  }
};
