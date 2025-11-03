require('dotenv').config();
const githubActionsService = require('./services/github-actions.service');

/**
 * Test GitHub Actions integration
 */
async function testGitHubActions() {
  console.log('🧪 Testing GitHub Actions Integration...\n');
  
  // Check if token is configured
  const hasToken = !!process.env.GITHUB_TOKEN;
  console.log(`1. GitHub Token: ${hasToken ? '✅ Configured' : '❌ Missing'}`);
  
  if (!hasToken) {
    console.error('\n❌ GITHUB_TOKEN not found in environment');
    console.log('💡 Set GITHUB_TOKEN in your .env file');
    process.exit(1);
  }
  
  console.log(`   Token preview: ${process.env.GITHUB_TOKEN.substring(0, 10)}...\n`);
  
  // Check if GitHub Actions service is configured
  const isConfigured = await githubActionsService.isConfigured();
  console.log(`2. Service configured: ${isConfigured ? '✅ Yes' : '❌ No'}\n`);
  
  if (!isConfigured) {
    console.error('❌ GitHub Actions service is not properly configured');
    process.exit(1);
  }
  
  // Try to trigger a test scan
  console.log('3. Attempting to trigger a test workflow...\n');
  
  try {
    const result = await githubActionsService.triggerScan({
      scanId: 'test-scan-' + Date.now(),
      repoUrl: 'https://github.com/utkarshchauhan26/3d_Animation-Website',
      scanType: 'fast',
      userId: 'test-user-123'
    });
    
    console.log('\n✅ SUCCESS! GitHub Actions workflow triggered');
    console.log('📋 Result:', result);
    console.log('\n🎉 GitHub Actions integration is working!');
    console.log('\n📝 Next steps:');
    console.log('   1. Check GitHub Actions tab: https://github.com/utkarshchauhan26/SecuraAi/actions');
    console.log('   2. You should see a new workflow run');
    console.log('   3. The workflow will fail (test scan ID doesn\'t exist in DB) - this is expected');
    
  } catch (error) {
    console.error('\n❌ FAILED to trigger GitHub Actions');
    console.error('📋 Error:', error.message);
    console.error('\n💡 Common issues:');
    console.error('   1. Invalid GitHub token (needs repo + workflow scopes)');
    console.error('   2. Token expired');
    console.error('   3. Wrong owner/repo in github-actions.service.js');
    console.error('\n🔧 To fix:');
    console.error('   1. Create new GitHub PAT: https://github.com/settings/tokens');
    console.error('   2. Select scopes: repo + workflow');
    console.error('   3. Update GITHUB_TOKEN in .env');
    process.exit(1);
  }
}

testGitHubActions().catch(console.error);
