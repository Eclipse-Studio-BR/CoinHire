import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export function Footer() {
  const { user, isAuthenticated } = useAuth();
  const postJobLink = isAuthenticated && (user?.role === "employer" || user?.role === "recruiter") 
    ? "/post-job" 
    : "/register";
  
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/">
              <img 
                src="/images/logos/coinhire.png" 
                alt="CoinHire" 
                className="h-8 cursor-pointer mb-4"
              />
            </Link>
            <p className="text-sm text-muted-foreground">
              The leading job board for Web3 and blockchain careers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Job Seekers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/jobs" className="hover:text-foreground transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/companies" className="hover:text-foreground transition-colors">
                  Companies
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-foreground transition-colors">
                  Create Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">For Employers</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={postJobLink} className="hover:text-foreground transition-colors">
                  Post a Job
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Employer Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-foreground transition-colors">About Us</a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CoinHire. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
