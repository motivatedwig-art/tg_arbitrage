const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/bot/handlers/CommandHandler.ts', 'utf8');

// Fix the lng variable issue in catch blocks
// We need to get the user language in each catch block

// Replace the error messages with proper language handling
const fixes = [
  // handleStart
  {
    from: `    } catch (error) {
      console.error('Error in handleStart:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleStart:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  },
  // handleHelp
  {
    from: `    } catch (error) {
      console.error('Error in handleHelp:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleHelp:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  },
  // handleStatus
  {
    from: `    } catch (error) {
      console.error('Error in handleStatus:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleStatus:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  },
  // handleSettings
  {
    from: `    } catch (error) {
      console.error('Error in handleSettings:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleSettings:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  },
  // handleLanguage
  {
    from: `    } catch (error) {
      console.error('Error in handleLanguage:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleLanguage:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  },
  // handleSubscribe
  {
    from: `    } catch (error) {
      console.error('Error in handleSubscribe:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleSubscribe:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  },
  // handleWebApp
  {
    from: `    } catch (error) {
      console.error('Error in handleWebApp:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleWebApp:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  },
  // handleStats
  {
    from: `    } catch (error) {
      console.error('Error in handleStats:', error);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`,
    to: `    } catch (error) {
      console.error('Error in handleStats:', error);
      const lng = await this.getUserLanguage(msg.from!.id);
      await this.bot.sendMessage(msg.chat.id, i18n.t('errors.generic', lng));
    }`
  }
];

let changes = 0;
fixes.forEach(fix => {
  if (content.includes(fix.from)) {
    content = content.replace(fix.from, fix.to);
    changes++;
  }
});

// Write back to file
fs.writeFileSync('src/bot/handlers/CommandHandler.ts', content);
console.log(`Fixed ${changes} lng variable issues in catch blocks`);
