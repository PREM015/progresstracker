
// Simulate the http client logic to see if we missed something
function mockHttpClient(data) {
    const apiResponse = data;
    if (apiResponse && typeof apiResponse.success === 'boolean') {
        if (!apiResponse.success) {
            throw new Error(apiResponse.error || 'Failed');
        }
        return apiResponse.data;
    }
    return data;
}

const mockApiResponse = {
    success: true,
    data: {
        pinnedAchievements: [1, 2, 3],
        totalPinned: 3
    },
    meta: { requestId: '123' }
};

const processed = mockHttpClient(mockApiResponse);
console.log('Processed:', processed);
console.log('Pinned:', processed.pinnedAchievements);

const serviceCode = (response) => {
    return response.pinnedAchievements;
}

console.log('Service Result:', serviceCode(processed));
