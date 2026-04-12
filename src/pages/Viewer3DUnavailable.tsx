import { ArrowLeft, Box } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Viewer3DUnavailable() {
  const { lang = "en" } = useParams();

  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl border-border/60 bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Box className="h-6 w-6" />
          </div>
          <CardTitle>3D Viewer temporarily unavailable</CardTitle>
          <CardDescription>
            The manually maintained Viewer3D file currently has syntax errors, so this route is disabled until that file is fixed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link to={`/${lang}/dashboard`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
