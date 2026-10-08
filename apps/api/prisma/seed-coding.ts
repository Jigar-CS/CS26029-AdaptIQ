import { PrismaClient, QuestionDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

const curatedList = [
  {
    slug: 'palindrome-number',
    title: 'Palindrome Number',
    difficulty: QuestionDifficulty.EASY,
    tags: 'Math, Two Pointers',
    description: 'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.\n\n**Example 1:**\n```\nInput: x = 121\nOutput: true\n```\n\n**Example 2:**\n```\nInput: x = -121\nOutput: false\n```',
    constraints: '• -2^31 <= x <= 2^31 - 1',
    hints: JSON.stringify(['Could negative integers ever be palindromes?', 'Try reversing the integer digits mathematically.']),
    starterCodes: JSON.stringify({
      PYTHON: 'def isPalindrome(x: int) -> bool:\n    # Write your solution here\n    pass\n',
      JAVASCRIPT: 'function isPalindrome(x) {\n    // Write your solution here\n}\n',
      CPP: 'bool isPalindrome(int x) {\n    // Write your solution here\n    return false;\n}\n',
      JAVA: 'class Solution {\n    public boolean isPalindrome(int x) {\n        return false;\n    }\n}\n',
    }),
    testCases: [
      { input: 'x = 121', expectedOutput: 'true', isHidden: false, explanation: '121 reads same both directions.' },
      { input: 'x = -121', expectedOutput: 'false', isHidden: false, explanation: 'Negative sign prevents palindrome.' },
      { input: 'x = 10', expectedOutput: 'false', isHidden: true, explanation: 'Reads 01 from right to left.' },
      { input: 'x = 0', expectedOutput: 'true', isHidden: true, explanation: 'Single digit 0 is palindrome.' },
    ],
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: QuestionDifficulty.EASY,
    tags: 'Array, Binary Search',
    description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.\n\n**Example 1:**\n```\nInput: nums = [-1, 0, 3, 5, 9, 12], target = 9\nOutput: 4\n```',
    constraints: '• 1 <= nums.length <= 10^4\n• -10^4 < nums[i], target < 10^4\n• All the integers in nums are unique and sorted.',
    hints: JSON.stringify(['Initialize two pointers: left = 0 and right = len(nums) - 1.', 'Calculate mid = (left + right) // 2 and narrow search space.']),
    starterCodes: JSON.stringify({
      PYTHON: 'def search(nums: list[int], target: int) -> int:\n    # Write your solution here\n    pass\n',
      JAVASCRIPT: 'function search(nums, target) {\n    // Write your solution here\n}\n',
      CPP: '#include <vector>\nint search(std::vector<int>& nums, int target) {\n    return -1;\n}\n',
      JAVA: 'class Solution {\n    public int search(int[] nums, int target) {\n        return -1;\n    }\n}\n',
    }),
    testCases: [
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 9', expectedOutput: '4', isHidden: false, explanation: '9 exists in nums at index 4.' },
      { input: 'nums = [-1, 0, 3, 5, 9, 12], target = 2', expectedOutput: '-1', isHidden: false, explanation: '2 does not exist in nums.' },
      { input: 'nums = [5], target = 5', expectedOutput: '0', isHidden: true, explanation: 'Single element match.' },
    ],
  },
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray (Kadane’s Algorithm)',
    difficulty: QuestionDifficulty.MEDIUM,
    tags: 'Array, Dynamic Programming',
    description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nA subarray is a contiguous non-empty sequence of elements within an array.\n\n**Example 1:**\n```\nInput: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\nOutput: 6\nExplanation: The subarray [4, -1, 2, 1] has the largest sum 6.\n```',
    constraints: '• 1 <= nums.length <= 10^5\n• -10^4 <= nums[i] <= 10^4',
    hints: JSON.stringify(['Use Kadane algorithm: keep track of current_sum and max_sum.', 'If current_sum becomes negative, reset it to 0.']),
    starterCodes: JSON.stringify({
      PYTHON: 'def maxSubArray(nums: list[int]) -> int:\n    # Write your solution here\n    pass\n',
      JAVASCRIPT: 'function maxSubArray(nums) {\n    // Write your solution here\n}\n',
      CPP: '#include <vector>\nint maxSubArray(std::vector<int>& nums) {\n    return 0;\n}\n',
      JAVA: 'class Solution {\n    public int maxSubArray(int[] nums) {\n        return 0;\n    }\n}\n',
    }),
    testCases: [
      { input: 'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6', isHidden: false, explanation: '[4, -1, 2, 1] sums to 6.' },
      { input: 'nums = [1]', expectedOutput: '1', isHidden: false, explanation: 'Single element array.' },
      { input: 'nums = [5, 4, -1, 7, 8]', expectedOutput: '23', isHidden: true, explanation: 'Entire array is optimal.' },
    ],
  },
  {
    slug: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: QuestionDifficulty.EASY,
    tags: 'Hash Table, String, Sorting',
    description: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.\n\nAn Anagram is a word formed by rearranging the letters of a different word, typically using all the original letters exactly once.\n\n**Example 1:**\n```\nInput: s = "anagram", t = "nagaram"\nOutput: true\n```',
    constraints: '• 1 <= s.length, t.length <= 5 * 10^4\n• s and t consist of lowercase English letters.',
    hints: JSON.stringify(['Count the frequency of each character in both strings.', 'If lengths differ, return false immediately.']),
    starterCodes: JSON.stringify({
      PYTHON: 'def isAnagram(s: str, t: str) -> bool:\n    # Write your solution here\n    pass\n',
      JAVASCRIPT: 'function isAnagram(s, t) {\n    // Write your solution here\n}\n',
      CPP: '#include <string>\nbool isAnagram(std::string s, std::string t) {\n    return false;\n}\n',
      JAVA: 'class Solution {\n    public boolean isAnagram(String s, String t) {\n        return false;\n    }\n}\n',
    }),
    testCases: [
      { input: 's = "anagram", t = "nagaram"', expectedOutput: 'true', isHidden: false, explanation: 'Characters match exactly.' },
      { input: 's = "rat", t = "car"', expectedOutput: 'false', isHidden: false, explanation: 'Letters differ.' },
      { input: 's = "ab", t = "a"', expectedOutput: 'false', isHidden: true, explanation: 'Different string lengths.' },
    ],
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: QuestionDifficulty.EASY,
    tags: 'Array, Dynamic Programming',
    description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day.\n\nYou want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.\n\n**Example 1:**\n```\nInput: prices = [7, 1, 5, 3, 6, 4]\nOutput: 5\nExplanation: Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6 - 1 = 5.\n```',
    constraints: '• 1 <= prices.length <= 10^5\n• 0 <= prices[i] <= 10^4',
    hints: JSON.stringify(['Keep track of minimum price seen so far.', 'For each day, calculate current price - min_price and update max_profit.']),
    starterCodes: JSON.stringify({
      PYTHON: 'def maxProfit(prices: list[int]) -> int:\n    # Write your solution here\n    pass\n',
      JAVASCRIPT: 'function maxProfit(prices) {\n    // Write your solution here\n}\n',
      CPP: '#include <vector>\nint maxProfit(std::vector<int>& prices) {\n    return 0;\n}\n',
      JAVA: 'class Solution {\n    public int maxProfit(int[] prices) {\n        return 0;\n    }\n}\n',
    }),
    testCases: [
      { input: 'prices = [7, 1, 5, 3, 6, 4]', expectedOutput: '5', isHidden: false, explanation: 'Buy at 1, sell at 6 = 5.' },
      { input: 'prices = [7, 6, 4, 3, 1]', expectedOutput: '0', isHidden: false, explanation: 'Monotonically decreasing, profit 0.' },
      { input: 'prices = [2, 4, 1]', expectedOutput: '2', isHidden: true, explanation: 'Buy at 2, sell at 4 = 2.' },
    ],
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: QuestionDifficulty.EASY,
    tags: 'Dynamic Programming, Math',
    description: 'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?\n\n**Example 1:**\n```\nInput: n = 2\nOutput: 2\nExplanation: 1 step + 1 step, or 2 steps.\n```',
    constraints: '• 1 <= n <= 45',
    hints: JSON.stringify(['Notice that ways(n) = ways(n-1) + ways(n-2), which is Fibonacci!']),
    starterCodes: JSON.stringify({
      PYTHON: 'def climbStairs(n: int) -> int:\n    # Write your solution here\n    pass\n',
      JAVASCRIPT: 'function climbStairs(n) {\n    // Write your solution here\n}\n',
      CPP: 'int climbStairs(int n) {\n    return 0;\n}\n',
      JAVA: 'class Solution {\n    public int climbStairs(int n) {\n        return 0;\n    }\n}\n',
    }),
    testCases: [
      { input: 'n = 2', expectedOutput: '2', isHidden: false, explanation: '1+1 or 2.' },
      { input: 'n = 3', expectedOutput: '3', isHidden: false, explanation: '1+1+1, 1+2, 2+1.' },
      { input: 'n = 5', expectedOutput: '8', isHidden: true, explanation: 'Fibonacci recurrence.' },
    ],
  },
  {
    slug: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: QuestionDifficulty.EASY,
    tags: 'Array, Hash Table, Sorting',
    description: 'Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.\n\n**Example 1:**\n```\nInput: nums = [1, 2, 3, 1]\nOutput: true\n```',
    constraints: '• 1 <= nums.length <= 10^5\n• -10^9 <= nums[i] <= 10^9',
    hints: JSON.stringify(['Use a hash set to track numbers already seen in O(1) time.']),
    starterCodes: JSON.stringify({
      PYTHON: 'def containsDuplicate(nums: list[int]) -> bool:\n    # Write your solution here\n    pass\n',
      JAVASCRIPT: 'function containsDuplicate(nums) {\n    // Write your solution here\n}\n',
      CPP: '#include <vector>\nbool containsDuplicate(std::vector<int>& nums) {\n    return false;\n}\n',
      JAVA: 'class Solution {\n    public boolean containsDuplicate(int[] nums) {\n        return false;\n    }\n}\n',
    }),
    testCases: [
      { input: 'nums = [1, 2, 3, 1]', expectedOutput: 'true', isHidden: false, explanation: '1 appears twice.' },
      { input: 'nums = [1, 2, 3, 4]', expectedOutput: 'false', isHidden: false, explanation: 'All elements distinct.' },
      { input: 'nums = [1, 1, 1, 3, 3, 4, 3, 2, 4, 2]', expectedOutput: 'true', isHidden: true, explanation: 'Multiple duplicates exist.' },
    ],
  },
];

async function main() {
  console.log('Seeding curated coding problems into MySQL...');
  let added = 0;
  for (const item of curatedList) {
    const existing = await prisma.codingProblem.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      await prisma.codingProblem.create({
        data: {
          slug: item.slug,
          title: item.title,
          description: item.description,
          difficulty: item.difficulty,
          tags: item.tags,
          constraints: item.constraints,
          hints: item.hints,
          starterCodes: item.starterCodes,
          testCases: {
            create: item.testCases.map((tc, idx) => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
              explanation: tc.explanation,
              order: idx + 1,
            })),
          },
        },
      });
      console.log(`+ Added: ${item.title} (${item.slug})`);
      added++;
    } else {
      console.log(`- Already exists: ${item.title}`);
    }
  }

  const total = await prisma.codingProblem.count();
  console.log(`Done! Added ${added} new problems. Total in database: ${total}`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
