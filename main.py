import pygame
import sys
from enum import Enum
from collections import defaultdict

# Initialize Pygame
pygame.init()

# Constants
WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 700
FPS = 60

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
BROWN = (139, 69, 19)
GRAY = (128, 128, 128)
DARK_GRAY = (64, 64, 64)
GREEN = (34, 139, 34)
YELLOW = (255, 255, 0)
BLUE = (30, 144, 255)
RED = (220, 20, 60)
CYAN = (0, 255, 255)
GOLD = (255, 215, 0)
LIGHT_GRAY = (200, 200, 200)

# Item Types
class ItemType(Enum):
    KEY = 1
    DIAMOND = 2

class GameState(Enum):
    PLAYING = 1
    SHOP = 2
    LEVEL_COMPLETE = 3

# Player Class
class Player(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.width = 40
        self.height = 60
        self.image = pygame.Surface((self.width, self.height))
        self.image.fill(BLUE)
        self.rect = self.image.get_rect(topleft=(x, y))
        
        self.vel_x = 0
        self.vel_y = 0
        self.on_ground = False
        self.jump_power = 15
        self.gravity = 0.6
        self.move_speed = 5
        
        # Inventory
        self.keys = defaultdict(int)
        self.diamonds = 0
        self.items_purchased = []
        
    def handle_input(self, keys):
        self.vel_x = 0
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.vel_x = -self.move_speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.vel_x = self.move_speed
        if (keys[pygame.K_SPACE] or keys[pygame.K_UP] or keys[pygame.K_w]) and self.on_ground:
            self.vel_y = -self.jump_power
            self.on_ground = False
    
    def update(self, platforms, collectibles, doors):
        # Apply gravity
        self.vel_y += self.gravity
        
        # Update position
        self.rect.x += self.vel_x
        self.check_collisions(platforms, horizontal=True)
        
        self.rect.y += self.vel_y
        self.on_ground = False
        self.check_collisions(platforms, horizontal=False)
        
        # Collect items
        self.collect_items(collectibles)
        
        # Check doors
        self.check_doors(doors)
        
        # Keep in bounds horizontally
        if self.rect.left < 0:
            self.rect.left = 0
        if self.rect.right > WINDOW_WIDTH:
            self.rect.right = WINDOW_WIDTH
        
        # Fall off screen
        if self.rect.top > WINDOW_HEIGHT:
            return False
        return True
    
    def check_collisions(self, platforms, horizontal):
        for platform in platforms:
            if self.rect.colliderect(platform.rect):
                if horizontal:
                    if self.vel_x > 0:  # Moving right
                        self.rect.right = platform.rect.left
                    elif self.vel_x < 0:  # Moving left
                        self.rect.left = platform.rect.right
                else:
                    if self.vel_y > 0:  # Falling
                        self.rect.bottom = platform.rect.top
                        self.vel_y = 0
                        self.on_ground = True
                    elif self.vel_y < 0:  # Jumping
                        self.rect.top = platform.rect.bottom
                        self.vel_y = 0
    
    def collect_items(self, collectibles):
        for item in collectibles:
            if self.rect.colliderect(item.rect):
                if item.item_type == ItemType.KEY:
                    self.keys[item.door_id] += 1
                elif item.item_type == ItemType.DIAMOND:
                    self.diamonds += 1
                collectibles.remove(item)
    
    def check_doors(self, doors):
        for door in doors:
            if self.rect.colliderect(door.rect) and door.door_id in self.keys and self.keys[door.door_id] > 0:
                self.keys[door.door_id] -= 1
                door.open()
    
    def draw(self, surface):
        pygame.draw.rect(surface, BLUE, self.rect)
        # Draw eyes
        pygame.draw.circle(surface, WHITE, (self.rect.x + 15, self.rect.y + 20), 3)
        pygame.draw.circle(surface, WHITE, (self.rect.x + 25, self.rect.y + 20), 3)

# Platform Class
class Platform(pygame.sprite.Sprite):
    def __init__(self, x, y, width, height, color=BROWN):
        super().__init__()
        self.rect = pygame.Rect(x, y, width, height)
        self.color = color
    
    def draw(self, surface):
        pygame.draw.rect(surface, self.color, self.rect)
        pygame.draw.rect(surface, DARK_GRAY, self.rect, 2)

# Collectible Items
class Collectible(pygame.sprite.Sprite):
    def __init__(self, x, y, item_type, door_id=0):
        super().__init__()
        self.item_type = item_type
        self.door_id = door_id
        self.size = 20
        self.rect = pygame.Rect(x, y, self.size, self.size)
        
        if item_type == ItemType.KEY:
            self.color = GOLD
        else:  # DIAMOND
            self.color = CYAN
        
        self.bob_offset = 0
        self.bob_speed = 0.1
    
    def update(self):
        self.bob_offset += self.bob_speed
        self.rect.y = self.rect.y - int(3 * pygame.math.Vector2(1, 0).dot((0.1, self.bob_speed)))
    
    def draw(self, surface):
        # Draw bobbing animation
        y_offset = int(5 * pygame.math.sin(self.bob_offset))
        draw_rect = self.rect.copy()
        draw_rect.y += y_offset
        
        pygame.draw.rect(surface, self.color, draw_rect)
        pygame.draw.rect(surface, WHITE, draw_rect, 2)
        
        if self.item_type == ItemType.KEY:
            # Draw key symbol
            pygame.draw.circle(surface, GOLD, (draw_rect.centerx - 5, draw_rect.centery), 3)
        else:
            # Draw diamond symbol
            pygame.draw.polygon(surface, CYAN, [
                (draw_rect.centerx, draw_rect.top + 2),
                (draw_rect.right - 2, draw_rect.centery),
                (draw_rect.centerx, draw_rect.bottom - 2),
                (draw_rect.left + 2, draw_rect.centery)
            ])

# Door Class
class Door(pygame.sprite.Sprite):
    def __init__(self, x, y, door_id):
        super().__init__()
        self.door_id = door_id
        self.rect = pygame.Rect(x, y, 40, 80)
        self.is_open = False
        self.color = RED
    
    def open(self):
        self.is_open = True
        self.color = GREEN
    
    def draw(self, surface):
        if not self.is_open:
            pygame.draw.rect(surface, self.color, self.rect)
            pygame.draw.rect(surface, DARK_GRAY, self.rect, 2)
            # Draw lock
            pygame.draw.circle(surface, YELLOW, (self.rect.centerx, self.rect.centery), 5)

# Shop Class
class Shop:
    def __init__(self, player):
        self.player = player
        self.items = [
            {"name": "Speed Boost", "cost": 50, "effect": "speed"},
            {"name": "High Jump", "cost": 75, "effect": "jump"},
            {"name": "Shield", "cost": 100, "effect": "shield"},
        ]
    
    def draw(self, surface):
        # Semi-transparent overlay
        overlay = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
        overlay.set_alpha(200)
        overlay.fill(BLACK)
        surface.blit(overlay, (0, 0))
        
        # Shop title
        font_large = pygame.font.Font(None, 48)
        title = font_large.render("SHOP", True, YELLOW)
        surface.blit(title, (WINDOW_WIDTH // 2 - title.get_width() // 2, 50))
        
        # Diamond balance
        font = pygame.font.Font(None, 36)
        balance_text = font.render(f"Diamonds: {self.player.diamonds}", True, CYAN)
        surface.blit(balance_text, (50, 120))
        
        # Items for sale
        font_item = pygame.font.Font(None, 28)
        y_offset = 180
        for i, item in enumerate(self.items):
            if item["name"] not in self.player.items_purchased:
                text = font_item.render(f"{i+1}. {item['name']} - {item['cost']} diamonds", True, WHITE)
                surface.blit(text, (100, y_offset + i * 50))
        
        # Instructions
        font_small = pygame.font.Font(None, 24)
        inst1 = font_small.render("Press 1-3 to buy items | Press ESC to exit", True, LIGHT_GRAY)
        surface.blit(inst1, (WINDOW_WIDTH // 2 - inst1.get_width() // 2, WINDOW_HEIGHT - 50))

# Level Class
class Level:
    def __init__(self, level_num):
        self.level_num = level_num
        self.platforms = []
        self.collectibles = []
        self.doors = []
        self.player = Player(50, 500)
        self.exit_pos = None
        
        self.create_level()
    
    def create_level(self):
        if self.level_num == 1:
            self.create_level_1()
        elif self.level_num == 2:
            self.create_level_2()
        elif self.level_num == 3:
            self.create_level_3()
    
    def create_level_1(self):
        # Ground
        self.platforms.append(Platform(0, WINDOW_HEIGHT - 60, WINDOW_WIDTH, 60, BROWN))
        
        # Platforms
        self.platforms.append(Platform(200, 550, 150, 20))
        self.platforms.append(Platform(450, 480, 150, 20))
        self.platforms.append(Platform(700, 410, 150, 20))
        self.platforms.append(Platform(950, 350, 200, 20))
        
        # Collectibles
        self.collectibles.append(Collectible(250, 500, ItemType.KEY, door_id=1))
        self.collectibles.append(Collectible(500, 430, ItemType.DIAMOND))
        self.collectibles.append(Collectible(750, 360, ItemType.DIAMOND))
        
        # Door
        self.doors.append(Door(1050, 250, door_id=1))
        
        # Exit
        self.exit_pos = pygame.Rect(1100, 250, 50, 50)
    
    def create_level_2(self):
        # Ground
        self.platforms.append(Platform(0, WINDOW_HEIGHT - 60, WINDOW_WIDTH, 60, BROWN))
        
        # More complex layout
        self.platforms.append(Platform(100, 550, 120, 20))
        self.platforms.append(Platform(300, 480, 120, 20))
        self.platforms.append(Platform(500, 420, 120, 20))
        self.platforms.append(Platform(250, 350, 120, 20))
        self.platforms.append(Platform(550, 320, 120, 20))
        self.platforms.append(Platform(800, 380, 120, 20))
        self.platforms.append(Platform(1000, 300, 180, 20))
        
        # Keys for multiple doors
        self.collectibles.append(Collectible(150, 500, ItemType.KEY, door_id=1))
        self.collectibles.append(Collectible(350, 430, ItemType.KEY, door_id=2))
        self.collectibles.append(Collectible(600, 370, ItemType.DIAMOND))
        self.collectibles.append(Collectible(850, 330, ItemType.DIAMOND))
        
        # Doors blocking path
        self.doors.append(Door(450, 400, door_id=1))
        self.doors.append(Door(750, 330, door_id=2))
        
        self.exit_pos = pygame.Rect(1050, 250, 50, 50)
    
    def create_level_3(self):
        # Ground
        self.platforms.append(Platform(0, WINDOW_HEIGHT - 60, WINDOW_WIDTH, 60, BROWN))
        
        # Hard level with many platforms
        self.platforms.append(Platform(80, 580, 100, 20))
        self.platforms.append(Platform(250, 520, 100, 20))
        self.platforms.append(Platform(420, 460, 100, 20))
        self.platforms.append(Platform(590, 400, 100, 20))
        self.platforms.append(Platform(760, 350, 100, 20))
        self.platforms.append(Platform(930, 310, 100, 20))
        
        # Horizontal platforms for extra challenge
        self.platforms.append(Platform(200, 480, 80, 20))
        self.platforms.append(Platform(500, 380, 80, 20))
        self.platforms.append(Platform(800, 300, 80, 20))
        
        # Many collectibles
        self.collectibles.append(Collectible(130, 530, ItemType.KEY, door_id=1))
        self.collectibles.append(Collectible(300, 470, ItemType.DIAMOND))
        self.collectibles.append(Collectible(470, 410, ItemType.KEY, door_id=2))
        self.collectibles.append(Collectible(640, 350, ItemType.DIAMOND))
        self.collectibles.append(Collectible(810, 300, ItemType.KEY, door_id=3))
        self.collectibles.append(Collectible(980, 260, ItemType.DIAMOND))
        
        # Multiple doors
        self.doors.append(Door(350, 420, door_id=1))
        self.doors.append(Door(700, 330, door_id=2))
        self.doors.append(Door(1050, 270, door_id=3))
        
        self.exit_pos = pygame.Rect(1050, 200, 50, 50)

# Game Class
class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Platform Game - Collect Keys & Diamonds")
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 32)
        self.font_small = pygame.font.Font(None, 24)
        
        self.current_level = 1
        self.level = Level(self.current_level)
        self.shop = Shop(self.level.player)
        self.game_state = GameState.PLAYING
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    if self.game_state == GameState.SHOP:
                        self.game_state = GameState.PLAYING
                    else:
                        return False
                if event.key == pygame.K_e:
                    self.game_state = GameState.SHOP
                # Shop purchases
                if self.game_state == GameState.SHOP:
                    if event.key == pygame.K_1 and self.level.player.diamonds >= 50:
                        self.level.player.diamonds -= 50
                        self.level.player.items_purchased.append("Speed Boost")
                        self.level.player.move_speed += 2
                    elif event.key == pygame.K_2 and self.level.player.diamonds >= 75:
                        self.level.player.diamonds -= 75
                        self.level.player.items_purchased.append("High Jump")
                        self.level.player.jump_power += 3
                    elif event.key == pygame.K_3 and self.level.player.diamonds >= 100:
                        self.level.player.diamonds -= 100
                        self.level.player.items_purchased.append("Shield")
        return True
    
    def update(self):
        if self.game_state == GameState.PLAYING:
            keys = pygame.key.get_pressed()
            self.level.player.handle_input(keys)
            
            # Update player
            alive = self.level.player.update(self.level.platforms, self.level.collectibles, self.level.doors)
            if not alive:
                self.level = Level(self.current_level)
                return
            
            # Update collectibles
            for item in self.level.collectibles:
                item.update()
            
            # Check if reached exit
            if self.level.exit_pos and self.level.player.rect.colliderect(self.level.exit_pos):
                self.current_level += 1
                if self.current_level > 3:
                    print("Game Complete! Final Score:", self.level.player.diamonds)
                    return False
                self.level = Level(self.current_level)
    
    def draw(self):
        self.screen.fill(WHITE)
        
        # Draw background
        pygame.draw.rect(self.screen, (135, 206, 250), (0, 0, WINDOW_WIDTH, WINDOW_HEIGHT))
        
        # Draw level elements
        for platform in self.level.platforms:
            platform.draw(self.screen)
        
        for item in self.level.collectibles:
            item.draw(self.screen)
        
        for door in self.level.doors:
            door.draw(self.screen)
        
        # Draw exit
        if self.level.exit_pos:
            pygame.draw.rect(self.screen, GOLD, self.level.exit_pos)
            pygame.draw.rect(self.screen, YELLOW, self.level.exit_pos, 3)
        
        # Draw player
        self.level.player.draw(self.screen)
        
        # Draw UI
        level_text = self.font.render(f"Level: {self.current_level}", True, BLACK)
        self.screen.blit(level_text, (10, 10))
        
        keys_text = self.font_small.render(f"Keys: {sum(self.level.player.keys.values())}", True, GOLD)
        self.screen.blit(keys_text, (10, 45))
        
        diamonds_text = self.font_small.render(f"Diamonds: {self.level.player.diamonds}", True, CYAN)
        self.screen.blit(diamonds_text, (10, 70))
        
        shop_text = self.font_small.render("Press E for Shop", True, BLACK)
        self.screen.blit(shop_text, (WINDOW_WIDTH - 200, 10))
        
        # Draw shop if open
        if self.game_state == GameState.SHOP:
            self.shop.draw(self.screen)
        
        pygame.display.flip()
    
    def run(self):
        running = True
        while running:
            running = self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()
