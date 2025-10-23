import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account preferences
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Your account settings are managed through your authentication provider.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                To update your profile information, email, or password, please visit your account settings with your authentication provider.
              </p>
              <Button variant="outline" asChild>
                <a href="/api/logout">Sign Out</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
