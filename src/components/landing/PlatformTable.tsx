import  Badge  from '@/components/ui/Badge';

const platforms = [
  { name: 'LeetCode', category: 'DSA', status: 'Active' },
  { name: 'Codeforces', category: 'DSA', status: 'Active' },
  { name: 'GitHub', category: 'OpenSource', status: 'Active' },
  { name: 'LinkedIn', category: 'Jobs', status: 'Active' },
  { name: 'Coursera', category: 'Learning', status: 'Active' },
  { name: 'Devpost', category: 'Hackathons', status: 'Active' },
  { name: 'CodeChef', category: 'DSA', status: 'Active' },
  { name: 'HackerRank', category: 'DSA', status: 'Active' },
];

export default function PlatformTable() {
  return (
    <section className="py-24 bg-muted/50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            50+ Platforms Supported
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Connect all your favorite platforms and track everything in one place.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border bg-background shadow">
          <table className="min-w-full divide-y">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {platforms.map((platform) => (
                <tr key={platform.name} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {platform.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Option 1: If Badge accepts children */}
                    <Badge variant="default">{platform.category}</Badge>
                    
                    {/* Option 2: If Badge uses label prop - uncomment this */}
                    {/* <Badge variant="default" label={platform.category} /> */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {/* Option 1: If Badge accepts children */}
                    <Badge variant="success">{platform.status}</Badge>
                    
                    {/* Option 2: If Badge uses label prop - uncomment this */}
                    {/* <Badge variant="success" label={platform.status} /> */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          + 42 more platforms including Kaggle, Unstop, Internshala, and more
        </p>
      </div>
    </section>
  );
}