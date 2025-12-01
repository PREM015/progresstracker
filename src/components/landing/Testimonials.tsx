import  Avatar  from '@/components/ui/Avatar';

const testimonials = [
  {
    name: 'Rahul Sharma',
    role: 'SDE @ Google',
    content: 'CodeSync helped me stay consistent with LeetCode. Got my dream job at Google!',
    avatar: null,
  },
  {
    name: 'Priya Patel',
    role: 'Student @ IIT Delhi',
    content: 'Love how it tracks everything automatically. No more manual spreadsheets!',
    avatar: null,
  },
  {
    name: 'Amit Kumar',
    role: 'Open Source Contributor',
    content: 'Perfect for tracking contributions across GitHub, GSoC, and Hacktoberfest.',
    avatar: null,
  },
];

export default function Testimonials() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by developers worldwide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="rounded-2xl border bg-card p-6 shadow-sm"
            >
              <p className="text-sm text-muted-foreground mb-4">
                &quot;{testimonial.content}&quot;
              </p>
              <div className="flex items-center gap-3">
                <Avatar
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  fallback={testimonial.name[0]}
                />
                <div>
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}