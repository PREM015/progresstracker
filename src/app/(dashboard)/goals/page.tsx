import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import GoalCard from "@/components/goals/GoalCard";
import CreateGoalModal from "@/components/goals/CreateGoalModal";
import  Button  from "@/components/ui/Button";

export const metadata = {
  title: "Goals - CodeSync Pro",
  description: "Set and track your coding goals",
};

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user's goals
  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const activeGoals = goals.filter((g) => !g.completedAt);
  const completedGoals = goals.filter((g) => g.completedAt);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Goals
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Set and track your coding goals
          </p>
        </div>
        <CreateGoalModal />
      </div>

      {/* Active Goals */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Active Goals ({activeGoals.length})
        </h2>
        {activeGoals.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No active goals yet
            </p>
            <CreateGoalModal />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </div>

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Completed Goals ({completedGoals.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}