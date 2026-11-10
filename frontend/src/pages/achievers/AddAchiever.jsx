import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Field, Icon, PageHeader, Segment, Spinner } from '../../components/ui';
import { errorMessage, post, upload } from '../../lib/api';

export default function AddAchiever() {
  const navigate = useNavigate();
  const [type, setType] = useState('ACADEMIC');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState } = useForm();
  const e = formState.errors;

  const pick = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      setPhoto((await upload('/achievers/upload', [file], 'photo')).url);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const submit = handleSubmit(async (v) => {
    setSaving(true);
    try {
      await post('/achievers', { ...v, type, photoUrl: photo });
      toast.success('Thank you! The nomination will appear after verification.');
      navigate('/achievers');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  const req = { required: 'Required' };
  return (
    <>
      <PageHeader eyebrow="Achievers" title="मानाचा तारा सुचवा" subtitle="Nominate yourself or someone from the community. Our team verifies every entry before it is published." icon="star" />
      <form onSubmit={submit} className="container-page max-w-3xl py-8">
        <div className="card space-y-5 p-5 sm:p-8">
          <Segment
            id="achtype"
            value={type}
            onChange={setType}
            options={[
              { value: 'ACADEMIC', label: '🎓 Academic' },
              { value: 'PROFESSIONAL', label: '🏆 Professional' },
            ]}
          />
          <div className="flex items-center gap-4">
            <label className="grid size-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-line text-muted hover:border-primary">
              {uploading ? <Spinner /> : photo ? <img src={photo} alt="" className="size-full object-cover" /> : <Icon name="camera" size={26} />}
              <input type="file" accept="image/*" hidden onChange={(ev) => pick(ev.target.files?.[0])} />
            </label>
            <p className="text-xs text-muted">Add a clear photo (optional) — any size.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Achiever’s name *" error={e.name?.message} {...register('name', req)} className="sm:col-span-2" />
            {type === 'ACADEMIC' ? (
              <>
                <Field label="School / college *" error={e.schoolName?.message} {...register('schoolName', req)} className="sm:col-span-2" />
                <Field as="select" label="Class *" {...register('grade', req)}>
                  <option>10th</option>
                  <option>12th</option>
                  <option>Graduation</option>
                  <option>Post-graduation</option>
                </Field>
                <Field label="Percentage" type="number" step="0.01" min={0} max={100} {...register('percentage')} />
                <Field label="Year" type="number" defaultValue={new Date().getFullYear()} {...register('year')} />
                <Field label="Stream" placeholder="e.g. Science" {...register('stream')} />
              </>
            ) : (
              <>
                <Field label="Role / title *" error={e.role?.message} {...register('role', req)} />
                <Field label="Organisation *" error={e.company?.message} {...register('company', req)} />
                <Field label="City" {...register('city')} />
                <Field label="LinkedIn URL" placeholder="https://linkedin.com/in/…" {...register('linkedinUrl')} />
              </>
            )}
            <Field as="textarea" label="Their story" placeholder="What makes this achievement special?" {...register('description')} className="sm:col-span-2" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving || uploading}>
            {saving ? <Spinner size={16} /> : 'Submit nomination'}
          </button>
        </div>
      </form>
    </>
  );
}
