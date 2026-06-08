import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config"; // Firebase configuration path
import ExamCard from "@/components/ExamCard";
import ExamSidebar from "@/components/ExamSidebar";

interface PageProps {
  params: {
    category: string;
  };
}

export default async function CategoryExamsPage({ params }: PageProps) {
  // 1. URL path se category parameter nikalen (e.g., 'ssc' ya 'bihar')
  const { category } = params;

  // 2. Firestore query banayein jisse sirf selected category filter ho
  const examsRef = collection(db, "exams");
  
  // URL parameters case-sensitive ho sakte hain, isliye lowerCase filter safe rahega
  const q = query(examsRef, where("category", "==", category.toLowerCase()));
  
  const querySnapshot = await getDocs(q);
  const exams = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      {/* Sidebar ko current category pass kar rahe hain active state ke liye */}
      <ExamSidebar currentCategory={category} />
      
      <main className="flex-1 p-6 md:p-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
                {category} Exams
              </h1>
              <p className="text-muted-foreground mt-1">
                {category.toUpperCase()} category ke sabhi available exams ki list.
              </p>
            </div>
            <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full variant-outline border">
              Total Exams: {exams.length}
            </div>
          </div>

          {/* Exams Grid Render logic */}
          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] border border-dashed rounded-xl p-8 text-center bg-card">
              <p className="text-lg font-medium text-muted-foreground">
                Is category mein abhi koi exams available nahi hain.
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Kripya database check karein ya thodi der baad dekhein.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam: any) => (
                <ExamCard key={exam.id} exam={exam} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}