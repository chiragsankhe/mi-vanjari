import { Link, useParams } from 'react-router-dom';
import { Icon, PageHeader, Reveal } from '../../components/ui';

const PAGES = {
  privacy: {
    title: 'गोपनीयता',
    eyebrow: 'Privacy',
    icon: 'lock',
    intro: 'Your trust matters more than anything. Here is how Mi Vanjari protects your information.',
    sections: [
      ['What we collect', 'Your verified email address (and mobile number, if you add one), the profile details you choose to add, photos you upload, and messages you send. We never ask for passwords, bank details or government IDs.'],
      ['Who can see what', 'Public profiles show basic details to logged-in community members. Private profiles show only first name, age range, city and gotra with a blurred photo until you accept a follow request. Your phone number is never shown in search, and is revealed only to accepted followers if you switch on “Show my phone number”.'],
      ['Photos', 'Every photo is re-processed when uploaded: location data (EXIF/GPS) is removed and a separate blurred copy is created, so the real photo is never sent to members who aren’t allowed to see it.'],
      ['Messages', 'Chat is available only between connected members. Screenshot and copy deterrence is enabled on chats and profiles (note: no website can fully block screenshots — please share responsibly).'],
      ['Your control', 'From Settings you can make your profile private, hide it, block members, log out of all devices, or permanently delete your account and all associated data.'],
    ],
  },
  safety: {
    title: 'सुरक्षा',
    eyebrow: 'Safety',
    icon: 'shield',
    intro: 'Simple habits that keep our community safe — especially while looking for a life partner.',
    sections: [
      ['Never send money', 'No genuine member will ask you for money, gifts or recharge. Report anyone who does — immediately.'],
      ['Involve your family', 'Meet for the first time in a public place, with family informed. Verify details through relatives and community elders.'],
      ['Keep personal details private', 'Don’t share your address, workplace or financial information early in a conversation.'],
      ['Use report & block', 'Every profile, post and listing has a report option. Our moderators review every report. Blocking hides your profile from that member instantly.'],
      ['Look for the green tick', 'The green tick means the member’s email or phone is verified. Admin-verified profiles carry extra trust.'],
    ],
  },
  contact: {
    title: 'संपर्क',
    eyebrow: 'Contact',
    icon: 'phone',
    intro: 'We’d love to hear from you — suggestions, partnerships, or help with your account.',
    sections: [
      ['Community help desk', 'Write to us at mivanjari1111@gmail.com — we reply as soon as we can.'],
      ['List a service or business', 'Use “List your service” or “List your business” — our team reviews listings within 48 hours.'],
      ['Report a concern', 'Use the report option on any profile or listing, or write to the help desk above.'],
      ['Volunteer with us', 'Help verify achievers, update our history pages or organise community events in your city.'],
    ],
  },
};

export default function Info() {
  const { page } = useParams();
  const p = PAGES[page] || PAGES.privacy;
  return (
    <>
      <PageHeader eyebrow={p.eyebrow} title={p.title} subtitle={p.intro} icon={p.icon} />
      <div className="container-page max-w-3xl space-y-4 py-10">
        {p.sections.map(([h, body], i) => (
          <Reveal key={h} delay={i * 0.05} className="card p-6">
            <h2 className="font-serif text-lg font-semibold">{h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </Reveal>
        ))}
        <div className="flex flex-wrap gap-2 pt-4">
          {Object.entries(PAGES)
            .filter(([k]) => k !== page)
            .map(([k, v]) => (
              <Link key={k} to={`/info/${k}`} className="btn btn-outline btn-sm">
                <Icon name={v.icon} size={15} /> {v.eyebrow}
              </Link>
            ))}
        </div>
      </div>
    </>
  );
}
