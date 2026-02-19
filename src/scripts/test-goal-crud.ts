
import { PrismaClient, GoalType, GoalMetric, PlatformCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Goal CRUD Test...');

    // 1. Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('No user found');
        return;
    }
    console.log(`Using user: ${user.email} (${user.id})`);

    // 2. Create a goal
    console.log('Creating goal...');
    const goal = await prisma.goal.create({
        data: {
            userId: user.id,
            title: 'Manual Test Goal',
            description: 'Testing CRUD operations',
            category: PlatformCategory.LEARNING,
            goalType: GoalType.CUSTOM,
            metric: GoalMetric.customMetric || GoalMetric.PROBLEMS_SOLVED,
            target: 10,
            currentValue: 0,
            startDate: new Date(),
            status: 'ACTIVE',
        },
    });
    console.log(`Created goal: ${goal.id}`);

    // 3. Read the goal
    console.log('Reading goal...');
    const readGoal = await prisma.goal.findUnique({
        where: { id: goal.id },
    });
    if (!readGoal) {
        console.error('Failed to read goal');
    } else {
        console.log(`Read goal: ${readGoal.title}`);
    }

    // 4. Update the goal
    console.log('Updating goal...');
    const updatedGoal = await prisma.goal.update({
        where: { id: goal.id },
        data: {
            title: 'Updated Manual Test Goal',
            progress: 5,
        },
    });
    console.log(`Updated goal: ${updatedGoal.title}, Progress: ${updatedGoal.progress}`);

    // 5. Delete the goal
    console.log('Deleting goal...');
    await prisma.goal.delete({
        where: { id: goal.id },
    });
    console.log('Deleted goal');

    // Verify deletion
    const deletedGoal = await prisma.goal.findUnique({
        where: { id: goal.id },
    });
    if (!deletedGoal) {
        console.log('Verification successful: Goal not found');
    } else {
        console.error('Verification failed: Goal still exists');
    }

    console.log('Test Complete');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
